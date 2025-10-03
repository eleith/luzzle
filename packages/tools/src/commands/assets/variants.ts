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
	sizes: Record<string, number>,
	formats: Array<'avif' | 'jpg'>
) {
	const jobs: {
		size: {
			name: string,
			width: number
		},
		format: (typeof formats)[number]
		sharp: Sharp.Sharp
	}[] = []

	try {
		const image = await pieces.getPieceAsset(asset)
		const sharpImage = Sharp(image)
		const sizeEntries = Object.entries(sizes)

		for (const format of formats) {
			for (const size of sizeEntries) {
				const name = size[0]
				const width = size[1]
				const sharp = generateVariantSharpJob(sharpImage, width, format)
				jobs.push({ size: { name, width }, format, sharp })
			}
		}
	} catch (error) {
		console.error(`error generating variant jobs for ${item.file_path} asset at ${asset}: ${error}`)
	}

	return jobs
}

export { generateVariantJobs }
