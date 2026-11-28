import type { RequestHandler } from './$types'
import { validatePublicationPath } from '#lib/server/publication-path.js'
import { getOpenWorkflow, getOpenWorkflowBackend } from '#lib/server/workflow/index.js'
import {
	findInFlightPublishRun,
	validateAuditForPublish,
	withPublishAdmission
} from '#lib/server/workflow/publish.js'
import { publishSpec } from '@luzzle/web.jobs/specs'
import type { PublishPayload, PublishPiecePayload } from '@luzzle/web.jobs'

interface PublishRequestBody {
	filePath?: unknown
	filePaths?: unknown
	auditRunId?: unknown
	bisync?: unknown
}

async function prepareArchivePublish(
	body: PublishRequestBody | null
): Promise<PublishPayload | Response> {
	const auditRunId = body?.auditRunId
	const selectionProvided = Object.hasOwn(body ?? {}, 'filePaths')
	let filePaths: string[] | undefined
	if (selectionProvided) {
		const requestedPaths = body?.filePaths
		if (
			!Array.isArray(requestedPaths) ||
			!requestedPaths.every((path) => typeof path === 'string')
		) {
			return Response.json({ message: 'filePaths must be an array of strings' }, { status: 400 })
		}
		filePaths = requestedPaths
	}

	if (auditRunId || selectionProvided) {
		const guard = await validateAuditForPublish(getOpenWorkflowBackend(), auditRunId, filePaths)
		if (!guard.ok) {
			return Response.json({ message: guard.reason }, { status: guard.status ?? 412 })
		}
		filePaths = guard.filePaths
	}

	let bisync = body?.bisync === true
	if (auditRunId) bisync = false
	const input: PublishPayload = { bisync }
	if (filePaths !== undefined) input.filePaths = filePaths
	return input
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: PublishRequestBody | null = await request.json().catch(() => ({}))
		let filePath: string | undefined
		if (Object.hasOwn(body ?? {}, 'filePath')) {
			const validatedPath = validatePublicationPath(body?.filePath)
			if (validatedPath instanceof Response) return validatedPath
			filePath = validatedPath
		}
		return await withPublishAdmission(async () => {
			const inFlight = await findInFlightPublishRun(getOpenWorkflowBackend())
			if (inFlight) {
				return Response.json({ jobId: inFlight.id }, { status: 409 })
			}

			let input: PublishPayload | PublishPiecePayload | Response
			if (filePath !== undefined) {
				input = { filePath }
			} else {
				input = await prepareArchivePublish(body)
			}
			if (input instanceof Response) return input

			const openWorkflow = getOpenWorkflow()
			const handle = await openWorkflow.runWorkflow(publishSpec, input)
			return Response.json({ jobId: handle.workflowRun.id })
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
