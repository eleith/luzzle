import { readFileSync, statSync } from 'fs'
import path from 'path'

export function imageToBase64(media: Buffer, extension: string) {
	const base64 = media.toString('base64')
	return `data:image/${extension};base64,${base64}`
}

export function mediaToBase64(mediaPath: string) {
	const mediaStat = statSync(mediaPath)
	const extension = path.extname(mediaPath).toLowerCase()

	if (mediaStat?.isFile()) {
		const mediaBuffer = readFileSync(mediaPath)
		return imageToBase64(mediaBuffer, extension)
	} else {
		throw new Error(`Media file not found at path: ${mediaPath}`)
	}
}
