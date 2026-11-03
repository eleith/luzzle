import { beforeEach, expect, test, vi } from 'vitest'
import { getOpenWorkflow } from '#lib/server/workflow/index.js'
import { previewSpec } from '@luzzle/web.jobs/specs'
import { actions, load } from './+page.server.js'

const { runWorkflow, parseFilename } = vi.hoisted(() => ({
	runWorkflow: vi.fn(),
	parseFilename: vi.fn()
}))
vi.mock('#lib/server/pieces.js', () => ({
	getPieces: () => ({ parseFilename })
}))
vi.mock('#lib/server/config.js', async () => {
	const { makeConfig } = await import('#lib/server/config.fixture.js')
	return {
		config: makeConfig({
			pieces: [{ type: 'book', fields: { title: 'title', date_consumed: 'read_on' } }]
		})
	}
})
vi.mock('#lib/server/workflow/index.js', () => ({ getOpenWorkflow: vi.fn() }))

beforeEach(() => {
	vi.clearAllMocks()
	parseFilename.mockReturnValue({ type: 'book' })
	vi.mocked(getOpenWorkflow).mockReturnValue({ runWorkflow } as never)
	runWorkflow.mockResolvedValue({ workflowRun: { id: 'preview-id' } })
})

test('loading or preloading the preview page does not create a job', async () => {
	const event = { params: { path: 'example.book.md' } } as Parameters<typeof load>[0]
	expect(await load(event)).toEqual({ file: 'example.book.md' })
	expect(getOpenWorkflow).not.toHaveBeenCalled()
	expect(runWorkflow).not.toHaveBeenCalled()
})

test('submitting the preview action creates a job and redirects to it', async () => {
	const event = { params: { path: 'example.book.md' } } as Parameters<typeof actions.default>[0]
	await expect(actions.default(event)).rejects.toMatchObject({
		status: 303,
		location: '/admin/piece/example.book.md/preview/preview-id'
	})
	expect(runWorkflow).toHaveBeenCalledExactlyOnceWith(previewSpec, { filePath: 'example.book.md' })
})

test.each([
	[
		'books/源 #?%.book.md',
		'job #?%',
		'/admin/piece/books/%E6%BA%90%20%23%3F%25.book.md/preview/job%20%23%3F%25'
	],
	[
		'nested/literal%2F.book.md',
		'preview-id',
		'/admin/piece/nested/literal%252F.book.md/preview/preview-id'
	]
])(
	'Preview starts once from raw file %s and redirects with encoded segments',
	async (file, job, location) => {
		runWorkflow.mockResolvedValue({ workflowRun: { id: job } })
		const event = { params: { path: file } } as Parameters<typeof actions.default>[0]
		await expect(actions.default(event)).rejects.toMatchObject({ status: 303, location })
		expect(runWorkflow).toHaveBeenCalledExactlyOnceWith(previewSpec, { filePath: file })
	}
)

test.each([undefined, 'unconfigured'])(
	'unsupported piece type %s cannot create a preview',
	async (type) => {
		parseFilename.mockReturnValue({ type })
		const event = { params: { path: 'example.book.md' } } as Parameters<typeof actions.default>[0]
		await expect(actions.default(event)).rejects.toMatchObject({ status: 404 })
		expect(getOpenWorkflow).not.toHaveBeenCalled()
		expect(runWorkflow).not.toHaveBeenCalled()
	}
)
