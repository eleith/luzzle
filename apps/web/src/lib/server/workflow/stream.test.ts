import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { streamJobProgress } from './stream.js'

const mocks = vi.hoisted(() => {
	const query = {
		selectAll: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		execute: vi.fn()
	}
	return {
		query,
		selectFrom: vi.fn(() => query),
		getOpenWorkflowDb: vi.fn(() => ({})),
		getWorkflowRun: vi.fn(),
		getStepAttempts: vi.fn()
	}
})

vi.mock('$lib/server/database/index.js', () => ({
	db: { selectFrom: mocks.selectFrom }
}))
vi.mock('./index.js', () => ({ getOpenWorkflowDb: mocks.getOpenWorkflowDb }))
vi.mock('@luzzle/web.jobs', () => ({
	getWorkflowRun: mocks.getWorkflowRun,
	getStepAttempts: mocks.getStepAttempts
}))

const run = {
	id: 'job-1',
	workflow_name: 'Publish',
	status: 'completed',
	error: null
}
const step = {
	phase: 'sync',
	status: 'succeeded',
	started_at: '2026-06-20T00:00:00Z',
	finished_at: '2026-06-20T00:00:01Z',
	message: null
}
const log = { job_id: 'job-1', phase: 'sync', line_number: 3, message: 'café\n🧩' }
const phaseFrame =
	'event: phase\ndata: [{"job_id":"job-1","phase":"sync","status":"completed","started_at":1781913600000,"finished_at":1781913601000,"message":null}]\n\n'

function openStream({
	header,
	cursor,
	jobClass = 'Publish'
}: { header?: string; cursor?: string; jobClass?: string | string[] } = {}) {
	const url = new URL('http://localhost/jobs/job-1/stream')
	if (cursor !== undefined) url.searchParams.set('cursor', cursor)
	const request = new Request(url, {
		headers: header === undefined ? {} : { 'Last-Event-ID': header }
	})
	return streamJobProgress({ jobId: 'job-1', jobClass, request, url })
}

async function readChunks(response: Response): Promise<string[]> {
	const reader = response.body!.getReader()
	const chunks: string[] = []
	while (true) {
		const { value, done } = await reader.read()
		if (done) return chunks
		// The existing stream enqueues strings, not the bytes Response.text() expects.
		expect(typeof value).toBe('string')
		chunks.push(value as unknown as string)
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.getWorkflowRun.mockReturnValue(run)
	mocks.getStepAttempts.mockReturnValue([step])
	mocks.query.execute.mockResolvedValue([])
})

afterEach(() => {
	vi.useRealTimers()
})

describe('streamJobProgress', () => {
	test('preserves headers and exact ordered job frames, including cursor ids', async () => {
		mocks.query.execute.mockResolvedValue([log])
		const response = openStream({ cursor: '{"sync":2,"other":8}' })
		expect(Object.fromEntries(response.headers)).toEqual({
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive',
			'x-accel-buffering': 'no'
		})
		expect(await readChunks(response)).toEqual([
			'event: state\ndata: {"state":"completed","result":"ok","errors":null}\n\n',
			phaseFrame,
			'event: log\ndata: [{"job_id":"job-1","phase":"sync","line_number":3,"message":"café\\n🧩"}]\n\n',
			'event: cursor\nid: {"sync":3,"other":8}\ndata: {"sync":3,"other":8}\n\n',
			'event: done\ndata: {"state":"completed","result":"ok","errors":null}\n\n'
		])
		expect(mocks.selectFrom).toHaveBeenCalledWith('job_progress_logs')
		expect(mocks.query.where.mock.calls).toEqual([
			['job_id', '=', 'job-1'],
			['phase', '=', 'sync'],
			['line_number', '>', 2]
		])
		expect(mocks.query.orderBy).toHaveBeenCalledWith('line_number', 'asc')
	})

	test.each([
		{ header: '{"sync":4}', cursor: '{"sync":2}', after: 4 },
		{ header: undefined, cursor: '{"sync":2}', after: 2 },
		{ header: '', cursor: '{"sync":2}', after: 0 },
		{ header: 'invalid', cursor: '{"sync":2}', after: 0 },
		{ header: 'null', cursor: '{"sync":2}', after: 0 },
		{ header: '7', cursor: '{"sync":2}', after: 0 },
		{ header: undefined, cursor: undefined, after: 0 }
	])('preserves cursor precedence and fallback: %j', async ({ header, cursor, after }) => {
		const chunks = await readChunks(openStream({ header, cursor }))
		expect(mocks.query.where).toHaveBeenCalledWith('line_number', '>', after)
		expect(chunks).toHaveLength(3)
		expect(chunks.some((chunk) => chunk.startsWith('event: cursor\n'))).toBe(false)
	})

	test('retains advanced cursors across polls without emitting unchanged cursors', async () => {
		vi.useFakeTimers()
		mocks.getWorkflowRun.mockReturnValueOnce({ ...run, status: 'running' })
		mocks.query.execute.mockResolvedValueOnce([log])
		const chunksPromise = readChunks(openStream())
		await vi.advanceTimersByTimeAsync(350)
		const chunks = await chunksPromise
		expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(2)
		expect(mocks.query.where.mock.calls.filter(([column]) => column === 'line_number')).toEqual([
			['line_number', '>', 0],
			['line_number', '>', 3]
		])
		expect(chunks.map((chunk) => chunk.split('\n')[0])).toEqual([
			'event: state',
			'event: phase',
			'event: log',
			'event: cursor',
			'event: state',
			'event: phase',
			'event: done'
		])
		expect(chunks[0]).toBe(
			'event: state\ndata: {"state":"running","result":null,"errors":null}\n\n'
		)
	})

	test.each([
		['completed', 'completed', '"ok"'],
		['succeeded', 'completed', '"ok"'],
		['failed', 'failed', 'null'],
		['canceled', 'canceled', 'null']
	])('preserves terminal state mapping for %s', async (status, state, result) => {
		mocks.getWorkflowRun.mockReturnValue({ ...run, status, error: 'detail' })
		const chunks = await readChunks(openStream({ jobClass: ['PublishAudit', 'Publish'] }))
		const data = `{"state":"${state}","result":${result},"errors":["detail"]}`
		expect(chunks).toEqual([
			`event: state\ndata: ${data}\n\n`,
			phaseFrame,
			`event: done\ndata: ${data}\n\n`
		])
	})

	test('closes with the existing error when the job is missing', async () => {
		mocks.getWorkflowRun.mockReturnValue(null)
		expect(await readChunks(openStream())).toEqual([
			'event: error\ndata: {"message":"Job not found"}\n\n'
		])
		expect(mocks.getStepAttempts).not.toHaveBeenCalled()
	})

	test('closes with the existing error for a disallowed job class', async () => {
		expect(await readChunks(openStream({ jobClass: ['Audit', 'Preview'] }))).toEqual([
			'event: error\ndata: {"message":"Job is not a Audit/Preview job"}\n\n'
		])
		expect(mocks.getStepAttempts).not.toHaveBeenCalled()
	})
})
