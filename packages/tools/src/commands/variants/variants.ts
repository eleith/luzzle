import Sharp from 'sharp'
import { Pieces } from '@luzzle/cli'
import { LuzzleSelectable } from '@luzzle/core'

function generateVariantSharpJob(sharp: Sharp.Sharp, width: number, format: 'avif' | 'jpg') {
	return sharp.clone().resize({ width }).toFormat(format)
}

async function generateVariantJobs(
	item: LuzzleSelectable<'pieces_items'>,
	asset: string,
	pieces: Pieces,
	sizes: Array<number>,
	formats: Array<'avif' | 'jpg'>
) {
	const jobs: {
		size?: (typeof sizes)[number]
		format?: (typeof formats)[number]
		sharp: Sharp.Sharp
	}[] = []

	try {
		const image = await pieces.getPieceAsset(asset)
		const sharpImage = Sharp(image)

		for (const format of formats) {
			for (const size of sizes) {
				const sharp = generateVariantSharpJob(sharpImage, size, format)
				jobs.push({ size, format, sharp })
			}
		}
	} catch (error) {
		console.error(`error generating variant jobs for ${item.file_path} asset at ${asset}: ${error}`)
	}

	return jobs
}

export { generateVariantJobs }
