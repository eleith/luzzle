import { error, redirect } from '@sveltejs/kit'
import { getPieces } from '$lib/server/pieces'
import { config } from '$lib/server/config'
import { getOpenWorkflow } from '$lib/server/workflow/index.js'
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

	const openWorkflow = getOpenWorkflow()
	const handle = await openWorkflow.runWorkflow(previewSpec, { filePath: file })
	const runId = handle.workflowRun.id
	redirect(303, `/admin/piece/${file}/preview/${runId}`)
}
