import type { RequestHandler } from './$types'
import { unpublishSpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow, getOpenWorkflowBackend } from '#lib/server/workflow/index.js'
import { findInFlightPublishRun, withPublishAdmission } from '#lib/server/workflow/publish.js'

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => null)
		const filePath = body?.filePath
		if (typeof filePath !== 'string') {
			return Response.json({ message: 'filePath must be a nonempty string' }, { status: 400 })
		}
		if (filePath.trim().length === 0) {
			return Response.json({ message: 'filePath must be a nonempty string' }, { status: 400 })
		}

		return await withPublishAdmission(async () => {
			const inFlight = await findInFlightPublishRun(getOpenWorkflowBackend())
			if (inFlight) return Response.json({ jobId: inFlight.id }, { status: 409 })

			const handle = await getOpenWorkflow().runWorkflow(unpublishSpec, { filePath })
			return Response.json({ jobId: handle.workflowRun.id })
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
