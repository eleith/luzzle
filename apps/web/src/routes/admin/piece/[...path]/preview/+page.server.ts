import { error, redirect } from '@sveltejs/kit'
import { getPieces } from '$lib/server/pieces'
import { config } from '$lib/server/config'
import { getOpenWorkflow } from '$lib/server/database/openworkflow.js'
import { previewSpec } from '@luzzle/web.jobs/specs'
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

	const jobId = Math.floor(Math.random() * 2147483647)
	const ow = getOpenWorkflow()
	await ow.runWorkflow(previewSpec, { filePath: file, jobId })
	redirect(303, `/admin/piece/${file}/preview/${jobId}`)
}
