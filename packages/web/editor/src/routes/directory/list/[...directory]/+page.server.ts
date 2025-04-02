import path from 'path'
import { getPieces } from '$lib/storage'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const directory = params.directory
	const canonicalDir = path.normalize(`/${directory}`)
	const parentDir = path.dirname(canonicalDir)
	const pieces = getPieces()
	const files = await pieces.getFilesIn(canonicalDir)

	return {
		files: {
			directories: files.directories,
			pieces: files.pieces.map((piece) => ({
				...pieces.parseFilename(piece)
			}))
		},
		directory: {
			parent: parentDir,
			current: canonicalDir
		}
	}
}
