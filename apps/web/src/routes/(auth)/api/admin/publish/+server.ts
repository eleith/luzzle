import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOpenWorkflow, getOpenWorkflowBackend } from '$lib/server/workflow/index.js'
import {
	findInFlightPublishRun,
	validateAuditForPublish,
	withPublishAdmission
} from '$lib/server/workflow/publish.js'
import { publishSpec } from '@luzzle/web.jobs/specs'
import type { PublishPayload } from '@luzzle/web.jobs'

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json().catch(() => ({}))
		return await withPublishAdmission(async () => {
			const inFlight = await findInFlightPublishRun(getOpenWorkflowBackend())
			if (inFlight) {
				return json({ jobId: inFlight.id }, { status: 409 })
			}

			const auditRunId = body?.auditRunId
			const selectionProvided = Object.hasOwn(body ?? {}, 'filePaths')
			let filePaths: string[] | undefined
			if (selectionProvided) {
				const requestedPaths = body.filePaths
				if (!Array.isArray(requestedPaths)) {
					return json({ message: 'filePaths must be an array of strings' }, { status: 400 })
				}
				if (!requestedPaths.every((filePath: unknown) => typeof filePath === 'string')) {
					return json({ message: 'filePaths must be an array of strings' }, { status: 400 })
				}
				filePaths = requestedPaths
			}

			if (auditRunId || selectionProvided) {
				const guard = await validateAuditForPublish(getOpenWorkflowBackend(), auditRunId, filePaths)
				if (!guard.ok) {
					return json({ message: guard.reason }, { status: guard.status ?? 412 })
				}
				filePaths = guard.filePaths
			}

			let bisync = body?.bisync === true
			if (auditRunId) bisync = false
			const input: PublishPayload = { bisync }
			if (filePaths !== undefined) input.filePaths = filePaths

			const openWorkflow = getOpenWorkflow()
			const handle = await openWorkflow.runWorkflow(publishSpec, input)
			return json({ jobId: handle.workflowRun.id })
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
