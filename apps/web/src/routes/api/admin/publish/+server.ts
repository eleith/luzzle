import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOpenWorkflow, getOpenWorkflowDb } from '$lib/server/workflow/index.js'
import { getLatestWorkflowRun } from '@luzzle/web.jobs'
import { publishSpec } from '@luzzle/web.jobs/specs'

export const POST: RequestHandler = async () => {
	try {
		// Check in-flight publish runs in OpenWorkflow database using the singleton connection
		const openWorkflowDb = getOpenWorkflowDb()
		const latest = getLatestWorkflowRun(openWorkflowDb, 'Publish')

		if (latest && (latest.status === 'pending' || latest.status === 'running')) {
			return json({ jobId: latest.id }, { status: 409 })
		}

		const openWorkflow = getOpenWorkflow()
		const handle = await openWorkflow.runWorkflow(publishSpec)
		const runId = handle.workflowRun.id
		return json({ jobId: runId })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
