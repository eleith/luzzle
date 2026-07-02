import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOpenWorkflow, getOpenWorkflowDb } from '$lib/server/workflow/index.js'
import { findInFlightPublishRun, validateAuditForPublish } from '$lib/server/workflow/publish.js'
import { publishSpec } from '@luzzle/web.jobs/specs'

export const POST: RequestHandler = async ({ request }) => {
	try {
		const db = getOpenWorkflowDb()

		const inFlight = findInFlightPublishRun(db)
		if (inFlight) {
			return json({ jobId: inFlight.id }, { status: 409 })
		}

		const body = await request.json().catch(() => ({}))
		const auditRunId = body?.auditRunId
		const bisync = body?.bisync === true

		if (auditRunId) {
			const guard = validateAuditForPublish(db, auditRunId)
			if (!guard.ok) {
				return json({ message: guard.reason }, { status: 412 })
			}
		}

		const openWorkflow = getOpenWorkflow()
		const handle = await openWorkflow.runWorkflow(publishSpec, {
			bisync: auditRunId ? false : bisync
		})
		return json({ jobId: handle.workflowRun.id })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
