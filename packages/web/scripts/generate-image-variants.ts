import { mkdirSync } from 'fs'
import sharp from 'sharp'
import { finalize, getItems, initialize } from './utils'

const VariantsFolder = './public/images/variants'

type ImageVariants = {
	sizes: Array<100 | 125 | 200 | 250 | 500 | 1000>
	dimensions: Array<{ width: number; height: number; label: string }>
}

async function makeVariants(
	slug: string,
	folder: string,
	path: string,
	variants: ImageVariants
): Promise<void> {
	try {
		const coverSharp = sharp(path)
		const types = ['jpg', 'avif'] as Array<'jpg' | 'avif'>
		const { sizes, dimensions } = variants

		for (const size of sizes) {
			for (const type of types) {
				for (const { width, height, label } of dimensions) {
					const variantPath = `${folder}/${slug}.${label}${size}.${type}`

					await coverSharp
						.resize({ width: Math.round(size * width), height: Math.round(size * height) })
						.toFile(variantPath)
				}
			}
		}

		console.log(`generated variants for: ${slug}`)
	} catch (e) {
		console.log(e)
		console.error(`error generating variants for: ${slug}`)
	}
}

async function makeManyVariants(
	folderTo: string,
	items: Array<{ slug: string; image: string }>,
	variants: ImageVariants
) {
	mkdirSync(folderTo, { recursive: true })

	for (const item of items) {
		await makeVariants(item.slug, folderTo, item.image, variants)
	}
}

async function main() {
	const { lastRun, db, luzzleFolder } = await initialize(VariantsFolder)

	const books = await getItems(db, lastRun, 'books')

	const bookCovers = books
		.filter((book) => book.cover)
		.map((book) => ({ slug: book.slug, image: `${luzzleFolder}/books/${book.cover}` }))
	await makeManyVariants(`${VariantsFolder}/books/covers`, bookCovers, {
		sizes: [125, 250, 500, 1000],
		dimensions: [{ width: 1, height: 3 / 2, label: 'w' }],
	})

	const links = await getItems(db, lastRun, 'links')
	const linkImages = links
		.filter((link) => link.representative_image)
		.map((link) => ({
			slug: link.slug,
			image: `${luzzleFolder}/links/${link.representative_image}`,
		}))
	await makeManyVariants(`${VariantsFolder}/links/representative_image`, linkImages, {
		sizes: [125, 250, 500, 1000],
		dimensions: [{ width: 3 / 2, height: 1, label: 'h' }],
	})

	const texts = await getItems(db, lastRun, 'texts')
	const textImages = texts
		.filter((text) => text.representative_image)
		.map((text) => ({
			slug: text.slug,
			image: `${luzzleFolder}/links/${text.representative_image}`,
		}))
	await makeManyVariants(`${VariantsFolder}/texts/representative_image`, textImages, {
		sizes: [125, 250, 500, 1000],
		dimensions: [{ width: 3 / 2, height: 1, label: 'h' }],
	})

	await finalize(VariantsFolder, new Date())
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(() => {
		console.log('complete: generate-image-variants')
	})
