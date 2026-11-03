import { error, redirect } from '@sveltejs/kit'
import { getPieces } from '#lib/server/pieces.js'
import { config } from '#lib/server/config.js'
import { getOpenWorkflow } from '#lib/server/workflow/index.js'
import { previewSpec } from '@luzzle/web.jobs/specs'
import type { Actions, PageServerLoad } from './$types'
import { previewHref } from '#lib/pieces/navigation.js'

function validatePreviewFile(file: string) {
	const { type } = getPieces().parseFilename(file)
	if (!type) error(404, 'piece type does not exist')
	if (!config.pieces.some((piece) => piece.type === type)) {
		error(404, 'piece type not configured')
	}
}

export const load: PageServerLoad = ({ params }) => {
	validatePreviewFile(params.path)
	return { file: params.path }
}

export const actions = {
	default: async ({ params }) => {
		const file = params.path
		validatePreviewFile(file)
		const handle = await getOpenWorkflow().runWorkflow(previewSpec, { filePath: file })
		redirect(303, previewHref(file, handle.workflowRun.id))
	}
} satisfies Actions
