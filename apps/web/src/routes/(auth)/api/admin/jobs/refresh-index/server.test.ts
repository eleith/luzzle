import { afterEach, expect, test, vi } from 'vitest'
import { refreshIndexSpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow, getOpenWorkflowBackend } from '#lib/server/workflow/index.js'
import {
	closeWorkflowQueue,
	createPendingRun,
	createWorkflowQueue
} from '#lib/server/workflow/publish.fixture.js'
import { POST } from './+server.js'

vi.mock('#lib/server/workflow/index.js', () => ({
	getOpenWorkflow: vi.fn(),
	getOpenWorkflowBackend: vi.fn()
}))

let queue: ReturnType<typeof createWorkflowQueue> | undefined

afterEach(async () => {
	if (queue) await closeWorkflowQueue(queue)
})

test('two simultaneous refresh requests enqueue only one index job', async () => {
	const { backend } = (queue = createWorkflowQueue())
	const runWorkflow = vi.fn(async () => ({
		workflowRun: await createPendingRun(backend, refreshIndexSpec.name)
	}))
	vi.mocked(getOpenWorkflowBackend).mockReturnValue(backend)
	vi.mocked(getOpenWorkflow).mockReturnValue({ runWorkflow } as unknown as ReturnType<
		typeof getOpenWorkflow
	>)

	const event = {} as Parameters<typeof POST>[0]
	const [first, duplicate] = await Promise.all([POST(event), POST(event)])

	expect(first.status).toBe(200)
	const started = await first.json()
	expect(started).toEqual({ jobId: expect.any(String) })
	expect(duplicate.status).toBe(409)
	expect(await duplicate.json()).toEqual(started)
	expect(runWorkflow).toHaveBeenCalledExactlyOnceWith(refreshIndexSpec, {})
})
