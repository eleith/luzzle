import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOpenWorkflow, getOpenWorkflowBackend } from '$lib/server/workflow/index.js'
import { findInFlightPublishRun, withPublishAdmission } from '$lib/server/workflow/publish.js'
import { publishAuditSpec } from '@luzzle/web.jobs/specs'

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => ({}))
		return await withPublishAdmission(async () => {
			const inFlight = await findInFlightPublishRun(getOpenWorkflowBackend())
			if (inFlight) {
				return json({ jobId: inFlight.id }, { status: 409 })
			}

			const bisync = body?.bisync === true

			const openWorkflow = getOpenWorkflow()
			const handle = await openWorkflow.runWorkflow(publishAuditSpec, { bisync })
			return json({ jobId: handle.workflowRun.id })
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
