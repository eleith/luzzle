import { error, redirect } from '@sveltejs/kit'
import { getPieces } from '$lib/server/pieces'
import { config } from '$lib/server/config'
import { Preview } from '$lib/server/sidequest.jobs.js'
import { Sidequest } from 'sidequest'
import type { PageServerLoad } from '../$types'

export const load: PageServerLoad = async ({ params }) => {
	const file = params.path
	const pieces = getPieces()
	const { type } = pieces.parseFilename(file)

	if (!type) {
		return error(404, 'piece type does not exist')
	}

	const pieceConfig = config.pieces.find((p) => p.type === type)
	if (!pieceConfig) {
		return error(404, 'piece type not configured')
	}

	const job = await Sidequest.build(Preview).maxAttempts(1).enqueue({ filePath: file })
	redirect(303, `./${job.id}`)
}
