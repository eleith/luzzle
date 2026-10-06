import { beforeEach, expect, test, vi } from 'vitest'
import { getOpenWorkflow } from '$lib/server/workflow/index.js'
import { previewSpec } from '@luzzle/web.jobs/specs'
import { load } from './+page.server.js'

const { runWorkflow } = vi.hoisted(() => ({ runWorkflow: vi.fn() }))
vi.mock('$lib/server/pieces', () => ({
	getPieces: () => ({ parseFilename: () => ({ type: 'book' }) })
}))
vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture.js')
	return {
		config: makeConfig({
			pieces: [{ type: 'book', fields: { title: 'title', date_consumed: 'read_on' } }]
		})
	}
})
vi.mock('$lib/server/workflow/index.js', () => ({ getOpenWorkflow: vi.fn() }))

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(getOpenWorkflow).mockReturnValue({ runWorkflow } as never)
	runWorkflow.mockResolvedValue({ workflowRun: { id: 'preview-id' } })
})

test('the UI queues its preview through the web client and redirects without the standalone POST', async () => {
	const event = { params: { path: 'example.book.md' } } as Parameters<typeof load>[0]
	await expect(load(event)).rejects.toMatchObject({
		status: 303,
		location: '/admin/piece/example.book.md/preview/preview-id'
	})
	expect(runWorkflow).toHaveBeenCalledWith(previewSpec, { filePath: 'example.book.md' })
})
