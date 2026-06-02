import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOpenWorkflow } from '@luzzle/web.jobs'
import { previewSpec } from '@luzzle/web.jobs/specs'

export const POST: RequestHandler = async ({ request }) => {
	let payload: { filePath?: unknown }
	try {
		payload = await request.json()
	} catch {
		throw error(400, 'invalid JSON body')
	}

	const filePath = payload.filePath
	if (typeof filePath !== 'string' || !filePath) {
		throw error(400, 'filePath is required')
	}

	try {
		const openWorkflow = getOpenWorkflow()
		const handle = await openWorkflow.runWorkflow(previewSpec, { filePath })
		const runId = handle.workflowRun.id
		return json({ jobId: runId })
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
