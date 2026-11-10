import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Pieces } from '@luzzle/core'
import { getStorage } from '#lib/server/storage.js'
import { getOpenWorkflowBackend } from '#lib/server/workflow/index.js'
import {
	createWorkflowQueue,
	closeWorkflowQueue,
	createPendingRun,
	type WorkflowQueue
} from '#lib/server/workflow/publish.fixture.js'
import { POST } from './+server.js'

const { runWorkflow } = vi.hoisted(() => ({ runWorkflow: vi.fn() }))
vi.mock('#lib/server/config.js', () => ({ config: { pieces: [{ type: 'books' }] } }))
vi.mock('#lib/server/pieces.js', () => ({
	getPieces: () => ({ parseFilename: Pieces.prototype.parseFilename })
}))
vi.mock('#lib/server/storage.js', () => ({ getStorage: vi.fn() }))
vi.mock('#lib/server/workflow/index.js', () => ({
	getOpenWorkflow: () => ({ runWorkflow }),
	getOpenWorkflowBackend: vi.fn()
}))

const filePath = '書 shelves/été?draft=1&tag=#%.books.md'
let queue: WorkflowQueue

function event(body: unknown = { filePath }) {
	return {
		request: new Request('http://localhost/api/admin/publish', {
			method: 'POST',
			body: JSON.stringify(body)
		})
	} as Parameters<typeof POST>[0]
}

beforeEach(() => {
	vi.resetAllMocks()
	queue = createWorkflowQueue()
	vi.mocked(getOpenWorkflowBackend).mockReturnValue(queue.backend)
	runWorkflow.mockImplementation(async (spec, input) => ({
		workflowRun: await createPendingRun(queue.backend, spec.name, input)
	}))
})

afterEach(async () => {
	await closeWorkflowQueue(queue)
})

test('queues only the canonical filename without accessing source storage', async () => {
	const response = await POST(event())
	expect(response.status).toBe(200)
	const { jobId } = await response.json()
	expect(runWorkflow).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ name: 'Publish' }),
		{ filePath }
	)
	expect((await queue.backend.getWorkflowRun({ workflowRunId: jobId }))?.input).toEqual({
		filePath
	})
	expect(getStorage).not.toHaveBeenCalled()
})

test.each([{ filePath: null }, { filePath: `../${filePath}` }, { filePath: 'one.unsupported.md' }])(
	'rejects invalid own filePath without falling back to bulk: $filePath',
	async (body) => {
		expect((await POST(event({ ...body, bisync: true }))).status).toBe(400)
		expect(runWorkflow).not.toHaveBeenCalled()
		expect(getStorage).not.toHaveBeenCalled()
		expect((await queue.backend.countWorkflowRuns()).pending).toBe(0)
	}
)
