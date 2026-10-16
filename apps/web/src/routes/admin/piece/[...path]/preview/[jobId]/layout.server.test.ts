import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getWorkflowRun, getStepAttempts, type WorkflowRunRow } from '@luzzle/web.jobs'
import type { AssembledPreview } from '$lib/pieces/preview/assemble.server.js'
import { publishedPiece } from '$lib/pieces/viewer/fixtures/published.js'
import { load } from './+layout.server.js'

const { assemblePreview, query } = vi.hoisted(() => ({
	assemblePreview: vi.fn<() => AssembledPreview>(),
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

const assembled: AssembledPreview = {
	piece: {
		...publishedPiece,
		id: 'preview',
		title: 'Draft',
		assets: [
			{
				asset_key: 'piece-key',
				transformation: 'markdown.html',
				asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content: '<p>Draft</p>'
			},
			...publishedPiece.assets
		]
	},
	tags: [{ slug: 'draft-tag', tag: 'Draft tag' }],
	outputs: [
		{
			asset_key: 'piece-key',
			transformation: 'markdown.html',
			asset_path: null,
			mime_type: 'text/html',
			is_embedded: 1,
			content: '<p>Draft</p>'
		}
	]
}

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
	assemblePreview.mockReturnValue(assembled)
	vi.setSystemTime(new Date('2026-06-22T00:00:00Z'))
	query.execute.mockResolvedValue([])
	vi.mocked(getWorkflowRun).mockResolvedValue(run())
	vi.mocked(getStepAttempts).mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

test('awaits SDK-backed metadata and preserves completed preview assembly', async () => {
	const data = await load(event())
	expect(data).toStrictEqual({
		preview: true,
		file: 'example.book.md',
		status: 'completed',
		job: 'preview-id',
		phases: [],
		logs: [],
		createdAt: '2026-06-20T00:00:00Z',
		finishedAt: '2026-06-21T00:00:00Z',
		...assembled
	})
	expect(data).toHaveProperty('outputs', assembled.outputs)
	expect(data).not.toHaveProperty('html')
	expect(assembled.outputs).not.toEqual(assembled.piece.assets)
	expect(assemblePreview).toHaveBeenCalledExactlyOnceWith(
		preview,
		expect.objectContaining({ type: 'book' })
	)
})

test.each(['pending', 'running', 'failed', 'canceled', 'completed'])(
	'forwards real run creation/finish timestamps for %s without using page-load time',
	async (status) => {
		vi.mocked(getWorkflowRun).mockResolvedValue(
			run({ status, created_at: '1970-01-01T00:00:00.000Z', finished_at: null })
		)
		const data = await load(event())
		expect(data).toMatchObject({ createdAt: '1970-01-01T00:00:00.000Z', finishedAt: null })
		expect(data).not.toHaveProperty('startedAt')
	}
)

test('expired runs retain their actual creation and finish times without assembling assets', async () => {
	vi.mocked(getWorkflowRun).mockResolvedValue(
		run({ created_at: '2026-06-18T00:00:00Z', finished_at: '2026-06-19T00:00:00Z' })
	)
	const data = await load(event())
	expect(data).toMatchObject({
		status: 'expired',
		createdAt: '2026-06-18T00:00:00Z',
		finishedAt: '2026-06-19T00:00:00Z'
	})
	expect(assemblePreview).not.toHaveBeenCalled()
})

test('preserves failed preview error data', async () => {
	vi.mocked(getWorkflowRun).mockResolvedValue(run({ status: 'failed', error: 'preview failed' }))
	const data = await load(event())
	expect(data).toMatchObject({
		preview: true,
		job: 'preview-id',
		status: 'failed',
		errorMessage: 'preview failed'
	})
	expect(data).not.toHaveProperty('outputs')
	expect(data).not.toHaveProperty('piece')
	expect(assemblePreview).not.toHaveBeenCalled()
})

test('preserves expiration based on the serialized SDK finish time', async () => {
	vi.mocked(getWorkflowRun).mockResolvedValue(run({ finished_at: '2026-06-19T00:00:00Z' }))
	const data = await load(event())
	expect(data).toMatchObject({
		preview: true,
		status: 'expired',
		job: 'preview-id'
	})
	expect(data).not.toHaveProperty('outputs')
	expect(data).not.toHaveProperty('piece')
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
		const data = await load(event())
		expect(data).toMatchObject({
			preview: true,
			job: 'preview-id',
			status: expected
		})
		expect(data).not.toHaveProperty('outputs')
		expect(data).not.toHaveProperty('piece')
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
	expect(assemblePreview).not.toHaveBeenCalled()
})

test.each([
	{ status: 'pending', expected: 'waiting' },
	{ status: 'running', expected: 'running' },
	{ status: 'canceled', expected: 'failed' }
])(
	'does not assemble or expose outputs for $status even with a stored result',
	async ({ status, expected }) => {
		vi.mocked(getWorkflowRun).mockResolvedValue(run({ status }))

		const data = await load(event())

		expect(data).toMatchObject({ preview: true, job: 'preview-id', status: expected })
		expect(data).not.toHaveProperty('outputs')
		expect(data).not.toHaveProperty('piece')
		expect(assemblePreview).not.toHaveBeenCalled()
	}
)

test('preserves an empty completed outputs DTO without falling back to piece assets', async () => {
	const passthroughOnly: AssembledPreview = {
		...assembled,
		piece: { ...assembled.piece, assets: publishedPiece.assets },
		outputs: []
	}
	assemblePreview.mockReturnValue(passthroughOnly)

	const data = await load(event())

	expect(data).toMatchObject({
		status: 'completed',
		piece: passthroughOnly.piece,
		tags: passthroughOnly.tags,
		outputs: []
	})
	expect(assemblePreview).toHaveBeenCalledOnce()
})
