import path from 'path'
import { getPieces } from '$lib/server/pieces'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const directory = params.directory || ''
	const canonicalDir = path.join('.', directory)
	const parentDir = path.dirname(canonicalDir)
	const pieces = getPieces()
	const files = await pieces.getFilesIn(canonicalDir)

	return {
		mode: 'directory',
		files: {
			directories: files.directories.map((d) => ({
				path: path.join(directory, d),
				name: d.replace(/\/$/, '')
			})),
			pieces: files.pieces.map((piece) => ({
				...pieces.parseFilename(path.join(directory, piece))
			})),
			assets: files.assets.map((asset) => ({
				path: path.join(directory, asset),
				name: asset
			}))
		},
		directory: {
			parent: parentDir,
			current: directory || '.'
		}
	}
}
