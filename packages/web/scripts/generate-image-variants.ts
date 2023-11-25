import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { loadEnvConfig } from '@next/env'
import { getDatabaseClient, PieceSelectable } from '@luzzle/kysely'
import sharp from 'sharp'

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

const VariantsFolder = './public/images/variants/books/covers'

async function makeCoverVariants(book: PieceSelectable<'books'>): Promise<void> {
	const toPath = `${process.env.LUZZLE_FOLDER}/books/${book.cover}`
	const coverSharp = sharp(toPath)
	const sizes = [125, 250, 500, 1000] as Array<125 | 250 | 500 | 1000>
	const types = ['jpg', 'avif'] as Array<'jpg' | 'avif'>

	for (const size of sizes) {
		for (const type of types) {
			const variantPath = `${VariantsFolder}/${book.slug}.w${size}.${type}`
			await coverSharp
				.resize({ width: size, height: Math.round((size * 3) / 2) })
				.toFile(variantPath)
		}
	}
}

async function handler(book: PieceSelectable<'books'>) {
	await makeCoverVariants(book)
}

async function getLastRun(defaultDate = new Date(0)) {
	try {
		const lastRun = readFileSync(`${VariantsFolder}/.generate-last-run`, 'utf-8')
		const lastRunDate = new Date(lastRun)

		if (!isNaN(lastRunDate as unknown as number)) {
			console.log(`last run: ${lastRunDate.toISOString()}`)
			return lastRunDate.getTime()
		}

		throw new Error('Invalid date')
	} catch (e) {
		return defaultDate.getTime()
	}
}

async function storeLastRun(date: Date) {
	writeFileSync(`${VariantsFolder}/.generate-last-run`, date.toISOString())
}

async function main() {
	mkdirSync(VariantsFolder, { recursive: true })

	const lastRun = await getLastRun(new Date(0))
	const db = getDatabaseClient(`${process.env.LUZZLE_FOLDER}/luzzle.sqlite`)
	const books = await db
		.selectFrom('books')
		.where((eb) =>
			eb.or([
				eb.and([eb.bxp('date_added', '>=', lastRun), eb.bxp('date_updated', 'is', null)]),
				eb.and([eb.bxp('date_updated', 'is not', null), eb.bxp('date_updated', '>=', lastRun)]),
			])
		)
		.selectAll()
		.execute()

	for (const book of books) {
		if (book.cover) {
			await handler(book)
			console.log(`generated variants for: ${book.slug}`)
		}
	}

	await storeLastRun(new Date())
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(() => {
		console.log('complete: generate-og-images')
	})
