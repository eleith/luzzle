import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import {
	getOpenWorkflow,
	getOpenWorkflowBackend,
	getOpenWorkflowDb
} from '$lib/server/workflow/index.js'
import {
	findInFlightPublishRun,
	validateAuditForPublish,
	withPublishAdmission
} from '$lib/server/workflow/publish.js'
import { publishSpec } from '@luzzle/web.jobs/specs'

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => ({}))
		return await withPublishAdmission(async () => {
			const inFlight = await findInFlightPublishRun(getOpenWorkflowBackend())
			if (inFlight) {
				return json({ jobId: inFlight.id }, { status: 409 })
			}

			const auditRunId = body?.auditRunId
			const bisync = body?.bisync === true

			if (auditRunId) {
				const guard = validateAuditForPublish(getOpenWorkflowDb(), auditRunId)
				if (!guard.ok) {
					return json({ message: guard.reason }, { status: 412 })
				}
			}

			const openWorkflow = getOpenWorkflow()
			const handle = await openWorkflow.runWorkflow(publishSpec, {
				bisync: auditRunId ? false : bisync
			})
			return json({ jobId: handle.workflowRun.id })
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
