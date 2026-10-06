import { expect, test, vi } from 'vitest'
import { publishSpec } from '@luzzle/web.jobs/specs'
import { config } from '$lib/server/config.js'
import { getOpenWorkflow, getOpenWorkflowBackend } from './index.js'
import { createWorkflowQueue, closeWorkflowQueue } from './publish.fixture.js'

vi.mock('$lib/server/config.js', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture.js')
	return { config: makeConfig() }
})

test('exposes the singleton SDK backend used by the web workflow client', async () => {
	const queue = createWorkflowQueue()
	config.worker.queue.path = `${queue.directory}/queue.sqlite`
	const backend = getOpenWorkflowBackend()
	try {
		expect(getOpenWorkflowBackend()).toBe(backend)
		const client = getOpenWorkflow()
		expect(getOpenWorkflow()).toBe(client)
		const handle = await client.runWorkflow(publishSpec, { bisync: false })
		const runs = await backend.listWorkflowRuns({
			workflowName: 'Publish',
			status: 'pending',
			limit: 1
		})
		expect(runs.data.map((run) => run.id)).toEqual([handle.workflowRun.id])
	} finally {
		await backend.stop()
		await closeWorkflowQueue(queue)
	}
})
