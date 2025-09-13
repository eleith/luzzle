import Sharp from 'sharp'
import { PieceFrontmatter, PieceMarkdown, Pieces } from '@luzzle/cli'
import path from 'path'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']

function generateVariantSharpJob(sharp: Sharp.Sharp, width: number, format: 'avif' | 'jpg') {
		return sharp.clone().resize({ width }).toFormat(format)
}

async function generateVariantJobs(
	asset: string,
	pieces: Pieces,
	sizes: Array<number>,
	formats: Array<'avif' | 'jpg'>,
) {
	const jobs: {
		size: (typeof sizes)[number]
		format: (typeof formats)[number]
		sharp: Sharp.Sharp
	}[] = []

	const image = await pieces.getPieceAsset(asset)
	const sharpImage = Sharp(image)

	for (const format of formats) {
		for (const size of sizes) {
			const sharp = generateVariantSharpJob(sharpImage, size, format)
			jobs.push({ size, format, sharp })
		}
	}

	return jobs
}

async function generateVariantForFieldAsset(
	markdown: PieceMarkdown<PieceFrontmatter>,
	pieces: Pieces,
	field: string,
	size: number,
	format: 'avif' | 'jpg',
) {
	const asset = markdown.frontmatter[field] as string | undefined

	if (!asset) {
		throw new Error(`No asset found for field ${field} in piece ${markdown.piece}`)
	}

	if (IMAGE_EXTENSIONS.indexOf(path.extname(asset).toLowerCase()) === -1) {
		throw new Error(`${asset} is not an image`)
	}

	const assetBuffer = await pieces.getPieceAsset(asset)
	const sharp = Sharp(assetBuffer)
	return generateVariantSharpJob(sharp, size, format).toBuffer()
}

export { generateVariantForFieldAsset, generateVariantJobs }
