import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOpenWorkflow } from '@luzzle/web.jobs/openworkflow'
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
		const jobId = Math.floor(Math.random() * 2147483647)
		const ow = getOpenWorkflow()
		await ow.runWorkflow(previewSpec, { filePath, jobId })
		return json({ jobId })
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
