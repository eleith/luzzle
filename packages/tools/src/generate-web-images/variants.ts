import Sharp from 'sharp'
import { copyFile, mkdir, readFile, stat } from 'fs/promises'
import path from 'path'
import { getLastRunFor, setLastRunFor } from './utils/lastRun.js'
import { type WebPieces } from './utils/types.js'

async function resize(image: Buffer, toPath: string) {
	const sharpStream = Sharp(image)
	const promises: Array<Promise<Sharp.OutputInfo>> = []

	for (const format of ['avif', 'jpg'] as const) {
		for (const size of ['small', 'medium', 'large', 'xl'] as const) {
			const lengths = {
				small: 125,
				medium: 250,
				large: 500,
				xl: 1000
			}

			promises.push(
				sharpStream
					.clone()
					.resize({ width: lengths[size] })
					.toFormat(format)
					.toFile(`${toPath}.${size}.${format}`)
			)
		}
	}

	await Promise.all(promises).catch((error) => {
		console.error(error)
	})
}

async function generateVariantsForPiece(piece: WebPieces, inDir: string, outDir: string) {
	const mediaPath = `${inDir}/${piece.media}`
	const mediaStat = await stat(mediaPath).catch(() => null)
	const mediaFileName = path.basename(mediaPath)
	const mediaFileBaseName = path.basename(mediaPath, path.extname(mediaPath))
	const variantDir = `${outDir}/${piece.type}/${piece.slug}`

	if (!mediaStat || !mediaStat.isFile()) {
		console.warn(`[skipping] media file not found for ${piece.type}/${piece.slug} at ${mediaPath}`)
		return
	}

	try {
		const mediaBuffer = await readFile(mediaPath)

		console.log(`generating variants for ${piece.type}/${piece.slug}`)
		await mkdir(variantDir, { recursive: true })
		await copyFile(mediaPath, `${variantDir}/${mediaFileName}`)
		await resize(mediaBuffer, `${variantDir}/${mediaFileBaseName}`)
	} catch {
		console.error(`error generating variants for ${piece.type}/${piece.slug} from ${piece.media}`)
	}
}

export async function generateVariantsForPieces(pieces: WebPieces[], inDir: string, outDir: string, force: boolean = false) {
	const operation = 'generate-variants'
	const lastRun = force ? new Date(0) : await getLastRunFor(outDir, operation)
	const piecesWithMedia = pieces.filter((p) => p.media)

	for (const piece of piecesWithMedia) {
		const pieceModifiedTime = new Date(piece.date_updated || piece.date_added)

		if (pieceModifiedTime > lastRun || force) {
			await generateVariantsForPiece(piece, inDir, outDir)
		}
	}

	if (!force) {
		await setLastRunFor(outDir, operation, new Date())
	}
}
