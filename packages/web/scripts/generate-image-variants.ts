import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { loadEnvConfig } from '@next/env'
import { getDatabaseClient, Pieces, PieceSelectable } from '@luzzle/kysely'
import sharp from 'sharp'

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

const VariantsFolder = './public/images/variants'
const LastRunFile = '.generate-last-run'

async function makeVariants(slug: string, folder: string, path: string): Promise<void> {
	try {
		const coverSharp = sharp(path)
		const sizes = [125, 250, 500, 1000] as Array<125 | 250 | 500 | 1000>
		const types = ['jpg', 'avif'] as Array<'jpg' | 'avif'>

		for (const size of sizes) {
			for (const type of types) {
				const variantPathWidth = `${folder}/${slug}.w${size}.${type}`
				const variantPathHeight = `${folder}/${slug}.h${size}.${type}`

				await coverSharp
					.resize({ width: Math.round((size * 3) / 2), height: size })
					.toFile(variantPathHeight)

				await coverSharp
					.resize({ width: size, height: Math.round((size * 3) / 2) })
					.toFile(variantPathWidth)
			}
		}

		console.log(`generated variants for: ${slug}`)
	} catch (e) {
		console.log(e)
		console.error(`error generating variants for: ${slug}`)
	}
}

async function getLastRun(defaultDate = new Date(0)) {
	try {
		if (!existsSync(`${VariantsFolder}/${LastRunFile}`) === false) {
			const lastRun = readFileSync(`${VariantsFolder}/${LastRunFile}`, 'utf-8')
			const lastRunDate = new Date(lastRun)

			if (!isNaN(lastRunDate as unknown as number)) {
				console.log(`last run: ${lastRunDate.toISOString()}`)
				return lastRunDate.getTime()
			}
		}

		throw new Error('Invalid date')
	} catch (e) {
		return defaultDate.getTime()
	}
}

async function storeLastRun(date: Date) {
	writeFileSync(`${VariantsFolder}/${LastRunFile}`, date.toISOString())
}

async function getItemsWithImages<T extends Pieces>(
	db: ReturnType<typeof getDatabaseClient>,
	lastRun: number,
	table: T,
	column: keyof PieceSelectable<T>
) {
	const folder = `${process.env.LUZZLE_FOLDER}/${table}`
	const items = await db
		.selectFrom(table as Pieces)
		.where((eb) =>
			eb.or([
				eb.and([eb.bxp('date_added', '>=', lastRun), eb.bxp('date_updated', 'is', null)]),
				eb.and([eb.bxp('date_updated', 'is not', null), eb.bxp('date_updated', '>=', lastRun)]),
			])
		)
		.selectAll()
		.execute()

	return items
		.filter((item) => item[column as keyof PieceSelectable])
		.map((item) => ({
			slug: item.slug,
			image: `${folder}/${item[column as keyof PieceSelectable]}`,
		}))
}

async function makeManyVariants(folderTo: string, items: Array<{ slug: string; image: string }>) {
	mkdirSync(folderTo, { recursive: true })

	for (const item of items) {
		await makeVariants(item.slug, folderTo, item.image)
	}
}

async function main() {
	const lastRun = await getLastRun(new Date(0))
	const db = getDatabaseClient(`${process.env.LUZZLE_FOLDER}/luzzle.sqlite`)

	const bookCovers = await getItemsWithImages(db, lastRun, 'books', 'cover')
	await makeManyVariants(`${VariantsFolder}/books/covers`, bookCovers)

	const linkImages = await getItemsWithImages(db, lastRun, 'links', 'representative_image')
	await makeManyVariants(`${VariantsFolder}/links/representative_image`, linkImages)

	await storeLastRun(new Date())
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(() => {
		console.log('complete: generate-image-variants')
	})
