import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getWorkflowRun, getStepAttempts, type WorkflowRunRow } from '@luzzle/web.jobs'
import type * as Jobs from '@luzzle/web.jobs'
import type { AssembledPreview } from '#lib/pieces/preview/assemble.server.js'
import { templatedPublishedPiece as publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import { config } from '#lib/server/config.js'
import { db } from '#lib/server/database/index.js'
import { getWebPiece } from '#lib/server/pieces.js'
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
vi.mock('#lib/server/database/index.js', () => ({ db: { selectFrom: () => query } }))
vi.mock('#lib/server/pieces.js', () => ({ getWebPiece: vi.fn() }))
vi.mock('#lib/server/config.js', async () => {
	const { makeConfig } = await import('#lib/server/config.fixture.js')
	return {
		config: makeConfig({
			pieces: { book: { fields: { title: 'title', date_consumed: 'read_on' } } }
		})
	}
})
vi.mock('#lib/server/workflow/index.js', () => ({ getOpenWorkflowBackend: () => ({}) }))
vi.mock('#lib/pieces/preview/assemble.server.js', () => ({ assemblePreview }))
vi.mock('@luzzle/web.jobs', async (importOriginal) => ({
	...(await importOriginal<typeof Jobs>()),
	getWorkflowRun: vi.fn(),
	getStepAttempts: vi.fn()
}))

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
		input: JSON.stringify({ filePath: 'example.book.md' }),
		output: JSON.stringify(preview),
		finished_at: '2026-06-21T00:00:00Z',
		created_at: '2026-06-20T00:00:00Z',
		...overrides
	}
}
const inlineConfiguredStyles = vi.fn()
function event(jobId = 'preview-id') {
	return { params: { jobId }, locals: { inlineConfiguredStyles } } as unknown as Parameters<
		typeof load
	>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(getWebPiece).mockResolvedValue(undefined)
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
		hasPublishedVersion: false,
		status: 'completed',
		job: 'preview-id',
		phases: [],
		logs: [],
		createdAt: '2026-06-20T00:00:00Z',
		finishedAt: '2026-06-21T00:00:00Z',
		...assembled
	})
	expect(getWorkflowRun).toHaveBeenCalledExactlyOnceWith({}, 'preview-id')
	expect(getWebPiece).toHaveBeenCalledExactlyOnceWith(db, 'example.book.md')
	expect(inlineConfiguredStyles).toHaveBeenCalledExactlyOnceWith()
	expect(data).toHaveProperty('outputs', assembled.outputs)
	expect(data).not.toHaveProperty('html')
	expect(assembled.outputs).not.toEqual(assembled.piece.assets)
	expect(assemblePreview).toHaveBeenCalledExactlyOnceWith(preview, config.pieces.book)
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
		run({
			created_at: '2026-06-18T00:00:00Z',
			finished_at: '2026-06-19T00:00:00Z',
			output: 'unparseable expired output'
		})
	)
	const data = await load(event())
	expect(data).toMatchObject({
		status: 'expired',
		file: 'example.book.md',
		hasPublishedVersion: false,
		createdAt: '2026-06-18T00:00:00Z',
		finishedAt: '2026-06-19T00:00:00Z'
	})
	expect(assemblePreview).not.toHaveBeenCalled()
})

test('preserves failed preview error data', async () => {
	vi.mocked(getWorkflowRun).mockResolvedValue(
		run({ status: 'failed', error: 'preview failed', output: 'unparseable failed output' })
	)
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
			file: 'example.book.md',
			hasPublishedVersion: false,
			status: expected
		})
		expect(data).not.toHaveProperty('outputs')
		expect(data).not.toHaveProperty('piece')
		expect(assemblePreview).not.toHaveBeenCalled()
	}
)

test('replacement layout data declares the newly requested Preview job', async () => {
	const nextEvent = event('next-job')
	vi.mocked(getWorkflowRun).mockResolvedValue(
		run({ id: 'next-job', input: JSON.stringify({ filePath: 'next.book.md' }) })
	)
	expect(await load(nextEvent)).toMatchObject({
		preview: true,
		job: 'next-job',
		file: 'next.book.md'
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

test.each(['pending', 'running', 'failed', 'canceled', 'completed', 'succeeded'])(
	'%s uses the job input file for display/actions and publication lookup, not output identity',
	async (status) => {
		const file = 'drafts/源 #?%.book.md'
		vi.mocked(getWorkflowRun).mockResolvedValue(
			run({ status, input: JSON.stringify({ filePath: file }) })
		)
		vi.mocked(getWebPiece).mockResolvedValue({
			id: 'published-id',
			key: 'published-key',
			file_path: file,
			title: 'Published title',
			type: 'book',
			slug: 'example',
			date_added: 10,
			date_updated: 20,
			json_metadata: '{}',
			content_hash: 'published-hash',
			last_published_at: 1234
		})

		const data = await load(event())

		expect(data).toMatchObject({
			preview: true,
			file,
			job: 'preview-id',
			hasPublishedVersion: true
		})
		expect(getWorkflowRun).toHaveBeenCalledExactlyOnceWith({}, 'preview-id')
		expect(getWebPiece).toHaveBeenCalledExactlyOnceWith(db, file)
		expect(inlineConfiguredStyles).toHaveBeenCalledExactlyOnceWith()
	}
)

test.each([
	{ workflow_name: 'Publish' },
	{ input: 'invalid JSON' },
	{ input: '{}' },
	{ input: 'null' },
	{ input: JSON.stringify({ filePath: 123 }) },
	{ input: JSON.stringify({ filePath: '' }) },
	{ input: JSON.stringify({ filePath: '   ' }) }
])(
	'rejects wrong-kind or unusable Preview inputs as ordinary missing jobs: %j',
	async (overrides) => {
		vi.mocked(getWorkflowRun).mockResolvedValue(run(overrides))

		await expect(load(event())).rejects.toMatchObject({ status: 404 })

		expect(getWorkflowRun).toHaveBeenCalledOnce()
		expect(getWebPiece).not.toHaveBeenCalled()
		expect(getStepAttempts).not.toHaveBeenCalled()
		expect(query.execute).not.toHaveBeenCalled()
		expect(assemblePreview).not.toHaveBeenCalled()
	}
)

test('pending previews retain their job-scoped phases and ordered logs before output exists', async () => {
	vi.mocked(getWorkflowRun).mockResolvedValue(run({ status: 'running', output: null }))
	vi.mocked(getStepAttempts).mockResolvedValue([
		{
			phase: 'transform',
			status: 'succeeded',
			started_at: '2026-06-20T00:00:01Z',
			finished_at: '2026-06-20T00:00:02Z',
			message: 'Generated assets'
		}
	])
	const logs = [
		{
			job_id: 'preview-id',
			phase: 'transform',
			line_number: 1,
			ts: 1000,
			level: 'info',
			message: 'Generated assets'
		}
	]
	query.execute.mockResolvedValue(logs)

	const data = await load(event())

	expect(data).toMatchObject({
		file: 'example.book.md',
		status: 'running',
		phases: [
			{
				job_id: 'preview-id',
				phase: 'transform',
				status: 'completed',
				started_at: Date.parse('2026-06-20T00:00:01Z'),
				finished_at: Date.parse('2026-06-20T00:00:02Z'),
				message: 'Generated assets'
			}
		],
		logs
	})
	expect(getStepAttempts).toHaveBeenCalledExactlyOnceWith({}, 'preview-id')
	expect(query.where).toHaveBeenCalledExactlyOnceWith('job_id', '=', 'preview-id')
	expect(query.orderBy).toHaveBeenCalledExactlyOnceWith('line_number', 'asc')
})
