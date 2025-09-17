import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { getLastRunFor, setLastRunFor } from './utils/lastRun.js'
import { type WebPieces } from './utils/types.js'
import { PieceFrontmatter, PieceMarkdown, Pieces, StorageFileSystem } from '@luzzle/cli'
import { generateVariantJobs } from '../generate-image-variants/variants.js'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']
const SIZES = {
	small: 125,
	medium: 250,
	large: 500,
	xl: 1000,
}

function isImageAsset(filename: string) {
	return IMAGE_EXTENSIONS.indexOf(path.extname(filename).toLowerCase()) !== -1
}

async function getImageAssetFields(
	markdown: PieceMarkdown<PieceFrontmatter>, 
	pieces: Pieces
): Promise<Array<{ name: string; asset: string }>> {
	const piece = await pieces.getPiece(markdown.piece)

	const fields = piece.fields.filter((f) => f.format === 'asset')
	const assets = fields.map((f) => ({
		name: f.name,
		asset: markdown.frontmatter[f.name] as string,
	}))

	return assets.filter((f) => f.asset && isImageAsset(f.asset))
}

async function generateVariantsForAssetField(
	asset: string,
	name: string,
	pieces: Pieces,
	variantDir: string
) {
	const baseName = path.basename(asset, path.extname(asset))
	const sizes = [SIZES.small, SIZES.medium, SIZES.large, SIZES.xl]
	const formats: Array<'avif' | 'jpg'> = ['avif', 'jpg']

	try {
		const jobs = await generateVariantJobs(asset, pieces, sizes, formats)
		const toFileJobs = jobs.map((job) =>
			job.sharp.toFile(`${variantDir}/${baseName}.${job.size}.${job.format}`)
		)
		await Promise.all(toFileJobs)
	} catch (error) {
		console.error(`error generating variants for field ${name} at ${asset}: ${error}`)
	}
}

export async function generateVariantsForPieces(
	webPieces: WebPieces[],
	luzzle: string,
	outDir: string,
	options: { force?: boolean, limit?: number }
) {
	const force = options.force || false
	const limit = options.limit || Infinity
	const operation = 'generate-variants'
	const lastRun = force ? new Date(0) : await getLastRunFor(outDir, operation)
	const storage = new StorageFileSystem(luzzle)
	const pieces = new Pieces(storage)
	const piecesToProcess = limit === Infinity ? webPieces : webPieces.slice(0, limit) 

	for (const webPiece of piecesToProcess) {
		const pieceModifiedTime = new Date(webPiece.date_updated || webPiece.date_added)

		if (pieceModifiedTime > lastRun || force) {
			const markdown = await pieces.getPieceMarkdown(webPiece.file_path)
			const fields = await getImageAssetFields(markdown, pieces)
			const variantDir = `${outDir}/${webPiece.type}/${webPiece.slug}`

			console.log(`generating variants for ${webPiece.type}/${webPiece.slug}`)
			await mkdir(variantDir, { recursive: true })

			for (const field of fields) {
				const fieldAsset = await pieces.getPieceAsset(field.asset)
				await writeFile(`${variantDir}/${path.basename(field.asset)}`, fieldAsset)
				await generateVariantsForAssetField(field.asset, field.name, pieces, variantDir)
			}
		}
	}

	if (!force && (limit === Infinity || !limit)) {
		await setLastRunFor(outDir, operation, new Date())
	}
}
