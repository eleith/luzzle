import { getPieces } from '$lib/pieces'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const pieces = getPieces()
	const files = await pieces.getFilesIn('.')

	return {
		files: {
			directories: files.directories,
			pieces: files.pieces.map((piece) => ({
				...pieces.parseFilename(piece)
			}))
		}
	}
}
