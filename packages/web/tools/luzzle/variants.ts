import { type WebPieces } from '../../src/lib/pieces/types'
import Sharp from 'sharp'
import { copyFile, mkdir, readFile, stat } from 'fs/promises'
import path from 'path'
import { getLastRunFor, setLastRunFor } from './lastRun'

const PRIVATE_LUZZLE_IMAGES_DIR = process.env.PRIVATE_LUZZLE_IMAGES_DIR as string
const PRIVATE_LUZZLE_DIR = process.env.PRIVATE_LUZZLE_DIR as string

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

async function generateVariantsForPiece(piece: WebPieces, lastRun: Date) {
	const pieceModifiedTime = new Date(piece.date_updated || piece.date_added)
	const mediaPath = `${PRIVATE_LUZZLE_DIR}/${piece.media}`
	const mediaStat = await stat(mediaPath).catch(() => null)
	const mediaFileName = path.basename(mediaPath)
	const mediaFileBaseName = path.basename(mediaPath, path.extname(mediaPath))
	const variantDir = `${PRIVATE_LUZZLE_IMAGES_DIR}/${piece.type}/${piece.slug}`

	if (!mediaStat || !mediaStat.isFile() || pieceModifiedTime < lastRun) {
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

export async function generateVariantsForPieces(pieces: WebPieces[]) {
	const operation = 'generate-variants'
	const lastRun = await getLastRunFor(PRIVATE_LUZZLE_IMAGES_DIR, operation)
	const piecesWithMedia = pieces.filter((p) => p.media)

	for (const piece of piecesWithMedia) {
		await generateVariantsForPiece(piece, lastRun)
	}

	await setLastRunFor(PRIVATE_LUZZLE_IMAGES_DIR, operation, new Date())
}
