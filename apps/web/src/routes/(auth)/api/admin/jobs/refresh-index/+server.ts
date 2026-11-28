import { refreshIndexSpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow, getOpenWorkflowBackend } from '#lib/server/workflow/index.js'
import { findInFlightPublishRun, withPublishAdmission } from '#lib/server/workflow/publish.js'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async () => {
	try {
		return await withPublishAdmission(async () => {
			const inFlight = await findInFlightPublishRun(getOpenWorkflowBackend())
			if (inFlight) return Response.json({ jobId: inFlight.id }, { status: 409 })

			const { workflowRun } = await getOpenWorkflow().runWorkflow(refreshIndexSpec, {})
			return Response.json({ jobId: workflowRun.id })
		})
	} catch (error) {
		console.error('Could not start archive index refresh:', error)
		return Response.json({ message: 'Could not start the index refresh.' }, { status: 500 })
	}
}
