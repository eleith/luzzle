import Sharp from 'sharp'
import { Pieces } from '@luzzle/core'
import type { Logger } from '../../logger.js'

const formatOptions: Record<'avif' | 'jpg', Sharp.AvifOptions | Sharp.JpegOptions> = {
	avif: { quality: 45, effort: 4 },
	jpg: { quality: 75, mozjpeg: true },
}

function generateVariantSharpJob(sharp: Sharp.Sharp, width: number, format: 'avif' | 'jpg') {
	return sharp.clone().resize({ width }).toFormat(format, formatOptions[format])
}

async function generateVariantJobs(
	filePath: string,
	asset: string,
	pieces: Pieces,
	widths: number[],
	formats: Array<'avif' | 'jpg'>,
	logger: Logger
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
		logger.error(`error generating variant jobs for ${filePath} asset at ${asset}`, {
			error: error instanceof Error ? error.message : String(error),
		})
	}

	return jobs
}

export { generateVariantJobs }
