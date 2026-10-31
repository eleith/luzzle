import { beforeEach, expect, test, vi } from 'vitest'
import { POST } from './+server.js'

const mocks = vi.hoisted(() => ({
	runWorkflow: vi.fn(),
	listWorkflowRuns: vi.fn()
}))
vi.mock('#lib/server/workflow/index.js', () => ({
	getOpenWorkflow: () => ({ runWorkflow: mocks.runWorkflow }),
	getOpenWorkflowBackend: () => ({ listWorkflowRuns: mocks.listWorkflowRuns })
}))

beforeEach(() => {
	vi.resetAllMocks()
	mocks.listWorkflowRuns.mockResolvedValue({ data: [] })
	mocks.runWorkflow.mockResolvedValue({ workflowRun: { id: 'unpublish-1' } })
})

function event(body: unknown) {
	return {
		request: new Request('http://localhost/api/admin/unpublish', {
			method: 'POST',
			body: JSON.stringify(body)
		})
	} as Parameters<typeof POST>[0]
}

test('queues exactly one file without decoding it or accepting publish options', async () => {
	const filePath = 'books/源 #?%.books.md'
	const response = await POST(event({ filePath, bisync: true, filePaths: ['other.books.md'] }))
	expect(response.status).toBe(200)
	expect(await response.json()).toEqual({ jobId: 'unpublish-1' })
	expect(mocks.runWorkflow).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ name: 'Unpublish' }),
		{ filePath }
	)
})

test.each([
	{ body: null },
	{ body: {} },
	{ body: { filePath: ['books/one.books.md'] } },
	{ body: { filePath: '' } },
	{ body: { filePath: '   ' } }
])('rejects invalid input before admission: $body', async ({ body }) => {
	const response = await POST(event(body))
	expect(response.status).toBe(400)
	expect(await response.json()).toEqual({ message: 'filePath must be a nonempty string' })
	expect(mocks.listWorkflowRuns).not.toHaveBeenCalled()
	expect(mocks.runWorkflow).not.toHaveBeenCalled()
})

test('rejects malformed JSON without queueing work', async () => {
	const request = new Request('http://localhost/api/admin/unpublish', {
		method: 'POST',
		body: '{'
	})
	const response = await POST({ request } as Parameters<typeof POST>[0])
	expect(response.status).toBe(400)
	expect(mocks.runWorkflow).not.toHaveBeenCalled()
})

test.each(['Publish', 'PublishAudit', 'Unpublish'])(
	'does not enqueue when a %s operation is active',
	async (name) => {
		mocks.listWorkflowRuns.mockImplementation(
			async ({ workflowName }: { workflowName: string }) => {
				if (workflowName === name) return { data: [{ id: 'busy-1', status: 'running' }] }
				return { data: [] }
			}
		)
		const response = await POST(event({ filePath: 'books/one.books.md' }))
		expect(response.status).toBe(409)
		expect(await response.json()).toEqual({ jobId: 'busy-1' })
		expect(mocks.runWorkflow).not.toHaveBeenCalled()
	}
)

test('reports enqueue errors and releases admission for a later request', async () => {
	mocks.runWorkflow.mockRejectedValueOnce(new Error('queue unavailable'))
	const failed = await POST(event({ filePath: 'books/one.books.md' }))
	expect(failed.status).toBe(500)
	expect(await failed.text()).toContain('queue unavailable')
	const accepted = await POST(event({ filePath: 'books/one.books.md' }))
	expect(accepted.status).toBe(200)
	expect(mocks.runWorkflow).toHaveBeenCalledTimes(2)
})
