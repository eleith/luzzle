import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOpenWorkflow, getOpenWorkflowDb } from '$lib/server/workflow/index.js'
import { findInFlightPublishRun } from '$lib/server/workflow/publish-guard.js'
import { publishAuditSpec } from '@luzzle/web.jobs/specs'

export const POST: RequestHandler = async ({ request }) => {
	try {
		const inFlight = findInFlightPublishRun(getOpenWorkflowDb())
		if (inFlight) {
			return json({ jobId: inFlight.id }, { status: 409 })
		}

		const body = await request.json().catch(() => ({}))
		const bisync = body?.bisync === true

		const openWorkflow = getOpenWorkflow()
		const handle = await openWorkflow.runWorkflow(publishAuditSpec, { bisync })
		return json({ jobId: handle.workflowRun.id })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
