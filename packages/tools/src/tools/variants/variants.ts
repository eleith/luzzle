import Sharp from 'sharp'
import { Pieces } from '@luzzle/cli'
import path from 'path'

function generateVariantSharpJob(sharp: Sharp.Sharp, width: number, format: 'avif' | 'jpg') {
	return sharp.clone().resize({ width }).toFormat(format)
}

function getVariantPath(type: string, id: string, asset: string, format?: 'jpg' | 'avif', size?: number) {
	const dir = `${type}/${id}`
	if (size && format) {
		const baseName = path.basename(asset, path.extname(asset))
		return `${dir}/${baseName}.w${size}.${format}`
	} else {
		return `${dir}/${path.basename(asset)}`
	}
}

async function generateVariantJobs(
	asset: string,
	pieces: Pieces,
	sizes: Array<number>,
	formats: Array<'avif' | 'jpg'>
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

export { generateVariantJobs, getVariantPath }
