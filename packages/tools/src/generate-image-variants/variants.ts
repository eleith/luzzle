import Sharp from 'sharp'
import { PieceFrontmatter, PieceMarkdown, Pieces } from '@luzzle/cli'

const SIZES = {
	small: 125,
	medium: 250,
	large: 500,
	xl: 1000,
}

async function generateVariantForImage(
	sharpImage: Sharp.Sharp,
	format: 'avif' | 'jpg',
	size: 'small' | 'medium' | 'large' | 'xl'
) {
	return sharpImage.clone().resize({ width: SIZES[size] }).toFormat(format).toBuffer()
}

async function generateVariantsForPiece(
	markdown: PieceMarkdown<PieceFrontmatter>,
	pieces: Pieces,
	field: string,
	format: Array<'avif' | 'jpg'>,
	size: Array<'small' | 'medium' | 'large' | 'xl'>
) {
	const asset = markdown.frontmatter[field]

	if (!asset) {
		throw new Error(`No asset found for field ${field} in piece ${markdown.piece}`)
	}

	const image = await pieces.getPieceAsset(markdown.frontmatter[field] as string)
	const sharpImage = Sharp(image)
	const promises: Array<Promise<Buffer>> = []

	for (const f of format) {
		for (const s of size) {
			const buffer = generateVariantForImage(sharpImage, f, s)
			promises.push(buffer)
		}
	}

	return promises
}

async function generateVariantForPiece(
	markdown: PieceMarkdown<PieceFrontmatter>,
	pieces: Pieces,
	field: string,
	format: 'avif' | 'jpg',
	size: 'small' | 'medium' | 'large' | 'xl'
) {
	const asset = markdown.frontmatter[field] as string | undefined

	if (!asset) {
		throw new Error(`No asset found for field ${field} in piece ${markdown.piece}`)
	}

	const image = await pieces.getPieceAsset(markdown.frontmatter[field] as string)
	const sharpImage = Sharp(image)

	return generateVariantForImage(sharpImage, format, size)
}

export { generateVariantsForPiece, generateVariantForPiece }
