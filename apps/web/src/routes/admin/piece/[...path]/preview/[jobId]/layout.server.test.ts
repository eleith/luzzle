import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getWorkflowRun, getStepAttempts, type WorkflowRunRow } from '@luzzle/web.jobs'
import { load } from './+layout.server.js'

const { assemblePreview, query } = vi.hoisted(() => ({
	assemblePreview: vi.fn(() => ({ html: 'rendered-preview' })),
	query: {
		selectAll: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		execute: vi.fn()
	}
}))
vi.mock('$lib/server/database/index.js', () => ({ db: { selectFrom: () => query } }))
vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture.js')
	return {
		config: makeConfig({
			pieces: [{ type: 'book', fields: { title: 'title', date_consumed: 'read_on' } }]
		})
	}
})
vi.mock('$lib/server/workflow/index.js', () => ({ getOpenWorkflowBackend: () => ({}) }))
vi.mock('$lib/pieces/preview/assemble.server.js', () => ({ assemblePreview }))
vi.mock('@luzzle/web.jobs', () => ({ getWorkflowRun: vi.fn(), getStepAttempts: vi.fn() }))

const preview = {
	filePath: 'example.book.md',
	type: 'book',
	slug: 'example',
	pieceKey: 'piece-key',
	sanitizedFrontmatter: { title: 'Draft' },
	note: 'note',
	pathToKey: {},
	transforms: []
}
function run(overrides: Partial<WorkflowRunRow> = {}): WorkflowRunRow {
	return {
		id: 'preview-id',
		workflow_name: 'Preview',
		status: 'completed',
		error: null,
		input: '{}',
		output: JSON.stringify(preview),
		finished_at: '2026-06-21T00:00:00Z',
		created_at: '2026-06-20T00:00:00Z',
		...overrides
	}
}
function event() {
	return { params: { jobId: 'preview-id', path: 'example.book.md' } } as Parameters<typeof load>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.setSystemTime(new Date('2026-06-22T00:00:00Z'))
	query.execute.mockResolvedValue([])
	vi.mocked(getWorkflowRun).mockResolvedValue(run())
	vi.mocked(getStepAttempts).mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

test('awaits SDK-backed metadata and preserves completed preview assembly', async () => {
	expect(await load(event())).toMatchObject({
		preview: true,
		file: 'example.book.md',
		status: 'completed',
		job: 'preview-id',
		phases: [],
		logs: [],
		html: 'rendered-preview'
	})
	expect(assemblePreview).toHaveBeenCalledWith(preview, expect.objectContaining({ type: 'book' }))
})

test('preserves failed preview error data', async () => {
	vi.mocked(getWorkflowRun).mockResolvedValue(run({ status: 'failed', error: 'preview failed' }))
	expect(await load(event())).toMatchObject({
		preview: true,
		job: 'preview-id',
		status: 'failed',
		errorMessage: 'preview failed'
	})
	expect(assemblePreview).not.toHaveBeenCalled()
})

test('preserves expiration based on the serialized SDK finish time', async () => {
	vi.mocked(getWorkflowRun).mockResolvedValue(run({ finished_at: '2026-06-19T00:00:00Z' }))
	expect(await load(event())).toMatchObject({
		preview: true,
		status: 'expired',
		job: 'preview-id'
	})
	expect(assemblePreview).not.toHaveBeenCalled()
})

test.each([
	{ status: 'pending', expected: 'waiting' },
	{ status: 'running', expected: 'running' },
	{ status: 'canceled', expected: 'failed' },
	{ status: 'completed', expected: 'completed' }
])(
	'declares preview and job for $status without assembled output',
	async ({ status, expected }) => {
		vi.mocked(getWorkflowRun).mockResolvedValue(run({ status, output: null }))
		expect(await load(event())).toMatchObject({
			preview: true,
			job: 'preview-id',
			status: expected
		})
		expect(assemblePreview).not.toHaveBeenCalled()
	}
)

test('replacement layout data declares the newly requested Preview job', async () => {
	const nextEvent = {
		params: { jobId: 'next-job', path: 'next.book.md' }
	} as Parameters<typeof load>[0]
	expect(await load(nextEvent)).toMatchObject({
		preview: true,
		job: 'next-job'
	})
	expect(getWorkflowRun).toHaveBeenLastCalledWith({}, 'next-job')
})

test('keeps missing SDK runs as a 404', async () => {
	vi.mocked(getWorkflowRun).mockResolvedValue(null)
	await expect(load(event())).rejects.toMatchObject({ status: 404 })
	expect(getStepAttempts).not.toHaveBeenCalled()
})
