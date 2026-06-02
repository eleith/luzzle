import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOpenWorkflow, getOpenWorkflowDb } from '$lib/server/database/openworkflow.js'
import { getLatestWorkflowRun } from '@luzzle/web.jobs/openworkflow'
import { publishSpec } from '@luzzle/web.jobs/specs'

export const POST: RequestHandler = async () => {
	try {
		// Check in-flight publish runs in OpenWorkflow database using the singleton connection
		const owDb = getOpenWorkflowDb()
		const latest = getLatestWorkflowRun(owDb, 'Publish')

		if (latest && (latest.status === 'pending' || latest.status === 'running')) {
			const inputData = JSON.parse(latest.input)
			if (inputData && typeof inputData.jobId === 'number') {
				return json({ jobId: inputData.jobId }, { status: 409 })
			}
		}

		const jobId = Math.floor(Math.random() * 2147483647)
		const ow = getOpenWorkflow()
		await ow.runWorkflow(publishSpec, { jobId })
		return json({ jobId })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
