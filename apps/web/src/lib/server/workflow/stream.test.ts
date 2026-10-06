import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { HEARTBEAT_MS, WORKFLOW_POLL_INTERVAL_MS } from '../constants.js'
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
		getOpenWorkflowBackend: vi.fn(() => ({})),
		getOpenWorkflow: vi.fn(),
		getWorkflowRun: vi.fn(),
		getStepAttempts: vi.fn()
	}
})

vi.mock('$lib/server/database/index.js', () => ({
	db: { selectFrom: mocks.selectFrom }
}))
vi.mock('./index.js', () => ({
	getOpenWorkflowBackend: mocks.getOpenWorkflowBackend,
	getOpenWorkflow: mocks.getOpenWorkflow
}))
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
	jobClass = 'Publish',
	signal
}: {
	header?: string
	cursor?: string
	jobClass?: string | string[]
	signal?: AbortSignal
} = {}) {
	const url = new URL('http://localhost/jobs/job-1/stream')
	if (cursor !== undefined) url.searchParams.set('cursor', cursor)
	const request = new Request(url, {
		headers: header === undefined ? {} : { 'Last-Event-ID': header },
		signal
	})
	return streamJobProgress({ jobId: 'job-1', jobClass, request, url })
}

async function readChunks(response: Response): Promise<string[]> {
	const reader = response.body!.getReader()
	const chunks: string[] = []
	while (true) {
		const { value, done } = await reader.read()
		if (done) return chunks
		expect(value).toBeInstanceOf(Uint8Array)
		chunks.push(new TextDecoder().decode(value))
	}
}

async function readFrame(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
	const { value, done } = await reader.read()
	expect(done).toBe(false)
	expect(value).toBeInstanceOf(Uint8Array)
	return new TextDecoder().decode(value)
}

function deferredLogs() {
	let resolve!: (logs: (typeof log)[]) => void
	const promise = new Promise<(typeof log)[]>((done) => {
		resolve = done
	})
	return { promise, resolve }
}

beforeEach(() => {
	vi.resetAllMocks()
	mocks.selectFrom.mockReturnValue(mocks.query)
	mocks.query.selectAll.mockReturnThis()
	mocks.query.where.mockReturnThis()
	mocks.query.orderBy.mockReturnThis()
	mocks.getOpenWorkflowBackend.mockReturnValue({})
	mocks.getWorkflowRun.mockResolvedValue(run)
	mocks.getStepAttempts.mockResolvedValue([step])
	mocks.query.execute.mockResolvedValue([])
})

afterEach(() => {
	// Observing or disconnecting must never acquire a worker client to cancel its job.
	expect(mocks.getOpenWorkflow).not.toHaveBeenCalled()
	vi.restoreAllMocks()
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
		await vi.advanceTimersByTimeAsync(WORKFLOW_POLL_INTERVAL_MS)
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

	test('keeps a quiet, pending database read alive every 15 seconds and cleans up on completion', async () => {
		vi.useFakeTimers()
		expect(HEARTBEAT_MS).toBe(15_000)
		expect(WORKFLOW_POLL_INTERVAL_MS).toBe(350)
		const pending = deferredLogs()
		mocks.query.execute.mockReturnValueOnce(pending.promise)
		const reader = openStream().body!.getReader()
		expect(await readFrame(reader)).toBe(
			'event: state\ndata: {"state":"completed","result":"ok","errors":null}\n\n'
		)
		expect(await readFrame(reader)).toBe(phaseFrame)
		const enqueue = vi.spyOn(ReadableStreamDefaultController.prototype, 'enqueue')

		for (let heartbeat = 0; heartbeat < 2; heartbeat++) {
			const frame = readFrame(reader)
			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS - 1)
			expect(enqueue).toHaveBeenCalledTimes(heartbeat)
			await vi.advanceTimersByTimeAsync(1)
			expect(await frame).toBe(': heartbeat\n\n')
			expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(1)
			expect(mocks.query.execute).toHaveBeenCalledTimes(1)
			expect(vi.getTimerCount()).toBe(1)
		}

		pending.resolve([])
		expect(await readFrame(reader)).toBe(
			'event: done\ndata: {"state":"completed","result":"ok","errors":null}\n\n'
		)
		expect(await reader.read()).toEqual({ done: true, value: undefined })
		expect(vi.getTimerCount()).toBe(0)
	})

	test.each(['request abort', 'reader cancel'] as const)(
		'%s stops polling and removes sleep listeners on both timeout and cancellation',
		async (disconnect) => {
			vi.useFakeTimers()
			mocks.getWorkflowRun.mockReturnValue({ ...run, status: 'running' })
			const abort = new AbortController()
			const add = vi.spyOn(AbortSignal.prototype, 'addEventListener')
			const remove = vi.spyOn(AbortSignal.prototype, 'removeEventListener')
			const reader = openStream({ signal: abort.signal }).body!.getReader()
			await readFrame(reader)
			await readFrame(reader)
			await vi.advanceTimersByTimeAsync(0)

			// The last registration is the current poll sleep, on the observer's signal.
			const sleepIndex = add.mock.calls.findLastIndex(([type]) => type === 'abort')
			const observerSignal = add.mock.contexts[sleepIndex] as AbortSignal
			expect(observerSignal).toBeInstanceOf(AbortSignal)
			expect(observerSignal).not.toBe(abort.signal)
			const addedListeners = () =>
				add.mock.calls
					.filter(
						([type], index) => type === 'abort' && add.mock.contexts[index] === observerSignal
					)
					.map(([, listener]) => listener)
			const removedListeners = () =>
				remove.mock.calls
					.filter(
						([type], index) => type === 'abort' && remove.mock.contexts[index] === observerSignal
					)
					.map(([, listener]) => listener)

			for (let poll = 1; poll <= 20; poll++) {
				expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(poll)
				expect(addedListeners()).toHaveLength(poll)
				expect(removedListeners()).toEqual(addedListeners().slice(0, -1))
				expect(vi.getTimerCount()).toBe(2)
				if (poll === 20) break
				await vi.advanceTimersByTimeAsync(WORKFLOW_POLL_INTERVAL_MS - 1)
				expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(poll)
				await vi.advanceTimersByTimeAsync(1)
				await readFrame(reader)
				await readFrame(reader)
			}

			if (disconnect === 'request abort') abort.abort()
			else await reader.cancel()
			expect(abort.signal.aborted).toBe(disconnect === 'request abort')
			expect(observerSignal.aborted).toBe(true)
			expect(removedListeners()).toEqual(addedListeners())
			expect(vi.getTimerCount()).toBe(0)
			expect(await reader.read()).toEqual({ done: true, value: undefined })
			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2)
			expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(20)
			expect(mocks.query.execute).toHaveBeenCalledTimes(20)
			expect(vi.getTimerCount()).toBe(0)
		}
	)

	test('an enqueue failure during poll sleep clears both timers and stops future polls', async () => {
		vi.useFakeTimers()
		mocks.getWorkflowRun.mockReturnValue({ ...run, status: 'running' })
		const abort = new AbortController()
		const chunksPromise = readChunks(openStream({ signal: abort.signal }))
		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS - 1)
		const polls = Math.floor((HEARTBEAT_MS - 1) / WORKFLOW_POLL_INTERVAL_MS) + 1
		expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(polls)
		expect(vi.getTimerCount()).toBe(2)
		const enqueue = vi
			.spyOn(ReadableStreamDefaultController.prototype, 'enqueue')
			.mockImplementationOnce(() => {
				throw new TypeError('Cannot enqueue into a closed stream')
			})

		await vi.advanceTimersByTimeAsync(1)
		expect(vi.getTimerCount()).toBe(0)
		expect(abort.signal.aborted).toBe(false)
		const chunks = await chunksPromise
		expect(chunks).toHaveLength(polls * 2)
		expect(chunks.every((chunk) => /^(event: state|event: phase)\n/.test(chunk))).toBe(true)
		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2)
		expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(polls)
		expect(mocks.query.execute).toHaveBeenCalledTimes(polls)
		expect(enqueue).toHaveBeenCalledTimes(1)
		expect(vi.getTimerCount()).toBe(0)
	})

	test.each(['request abort', 'reader cancel', 'enqueue failure'] as const)(
		'%s closes immediately during an in-flight DB read, with no later polling or frames',
		async (disconnect) => {
			vi.useFakeTimers()
			mocks.getWorkflowRun.mockReturnValue({ ...run, status: 'running' })
			const pending = deferredLogs()
			mocks.query.execute.mockReturnValueOnce(pending.promise)
			const abort = new AbortController()
			const reader = openStream({ signal: abort.signal }).body!.getReader()
			await readFrame(reader)
			await readFrame(reader)
			expect(vi.getTimerCount()).toBe(1)
			const enqueue = vi.spyOn(ReadableStreamDefaultController.prototype, 'enqueue')

			if (disconnect === 'request abort') abort.abort()
			else if (disconnect === 'reader cancel') await reader.cancel()
			else {
				enqueue.mockImplementationOnce(() => {
					throw new TypeError('Cannot enqueue into a closed stream')
				})
				await vi.advanceTimersByTimeAsync(HEARTBEAT_MS)
			}

			// Neither closing the response nor clearing timers may wait for the DB promise.
			expect(abort.signal.aborted).toBe(disconnect === 'request abort')
			expect(vi.getTimerCount()).toBe(0)
			expect(await reader.read()).toEqual({ done: true, value: undefined })
			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2)
			expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(1)
			expect(mocks.query.execute).toHaveBeenCalledTimes(1)

			pending.resolve([log])
			await vi.advanceTimersByTimeAsync(0)
			// A DB read finishing after disconnect must not start another polling wait.
			expect(vi.getTimerCount()).toBe(0)
			await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2)
			expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(1)
			expect(mocks.query.execute).toHaveBeenCalledTimes(1)
			expect(enqueue).toHaveBeenCalledTimes(disconnect === 'enqueue failure' ? 1 : 0)
			expect(vi.getTimerCount()).toBe(0)
			expect(await reader.read()).toEqual({ done: true, value: undefined })
		}
	)

	test.each([
		{ read: 'run', disconnect: 'request abort' },
		{ read: 'run', disconnect: 'reader cancel' },
		{ read: 'steps', disconnect: 'request abort' },
		{ read: 'steps', disconnect: 'reader cancel' }
	])(
		'$disconnect during an SDK $read read does not start later queries',
		async ({ read, disconnect }) => {
			vi.useFakeTimers()
			let finishRead!: () => void
			const pending = new Promise<unknown>((resolve) => {
				finishRead = () => resolve(read === 'run' ? run : [step])
			})
			if (read === 'run') mocks.getWorkflowRun.mockReturnValueOnce(pending)
			else mocks.getStepAttempts.mockReturnValueOnce(pending)
			const abort = new AbortController()
			const reader = openStream({ signal: abort.signal }).body!.getReader()
			if (read === 'steps') await readFrame(reader)
			expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(1)
			if (disconnect === 'request abort') abort.abort()
			else await reader.cancel()
			expect(await reader.read()).toEqual({ done: true, value: undefined })
			expect(vi.getTimerCount()).toBe(0)

			finishRead()
			await vi.advanceTimersByTimeAsync(0)
			expect(mocks.getStepAttempts).toHaveBeenCalledTimes(read === 'run' ? 0 : 1)
			expect(mocks.query.execute).not.toHaveBeenCalled()
			expect(mocks.getWorkflowRun).toHaveBeenCalledTimes(1)
			expect(vi.getTimerCount()).toBe(0)
		}
	)

	test('an already-aborted request never polls, emits, or installs timers', async () => {
		vi.useFakeTimers()
		const abort = new AbortController()
		abort.abort()
		const enqueue = vi.spyOn(ReadableStreamDefaultController.prototype, 'enqueue')
		expect(await readChunks(openStream({ signal: abort.signal }))).toEqual([])
		expect(vi.getTimerCount()).toBe(0)
		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 2)
		expect(mocks.getOpenWorkflowBackend).not.toHaveBeenCalled()
		expect(mocks.getWorkflowRun).not.toHaveBeenCalled()
		expect(mocks.getStepAttempts).not.toHaveBeenCalled()
		expect(mocks.query.execute).not.toHaveBeenCalled()
		expect(enqueue).not.toHaveBeenCalled()
		expect(vi.getTimerCount()).toBe(0)
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
