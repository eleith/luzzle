import Sharp from 'sharp'
import { Pieces } from '@luzzle/core'

function generateVariantSharpJob(sharp: Sharp.Sharp, width: number, format: 'avif' | 'jpg') {
	return sharp.clone().resize({ width }).toFormat(format)
}

async function generateVariantJobs(
	filePath: string,
	asset: string,
	pieces: Pieces,
	widths: number[],
	formats: Array<'avif' | 'jpg'>
) {
	const jobs: {
		width: number
		format: (typeof formats)[number]
		sharp: Sharp.Sharp
	}[] = []

	try {
		const image = await pieces.getPieceAsset(asset)
		const sharpImage = Sharp(image)

		for (const format of formats) {
			for (const width of widths) {
				const sharp = generateVariantSharpJob(sharpImage, width, format)
				jobs.push({ width, format, sharp })
			}
		}
	} catch (error) {
		console.error(`error generating variant jobs for ${filePath} asset at ${asset}: ${error}`)
	}

	return jobs
}

export { generateVariantJobs }
