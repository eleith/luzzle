import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DEFAULT_GENERATION_LIMITS, GenerationValidationError } from '@luzzle/core'
import type { GenerationEvent, GenerationResult } from '$lib/generation/types'
import { createGenerationStream } from './stream'

const result: GenerationResult = { markdown: 'café\n🧩 日本語' }
const decoder = new TextDecoder()

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (reason: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}

function events(text: string): GenerationEvent[] {
	return text
		.split('\n\n')
		.filter((frame) => frame.startsWith('event:'))
		.map((frame) => {
			const [type, data] = frame.split('\n')
			return { type: type.slice(7), data: JSON.parse(data.slice(6)) } as GenerationEvent
		})
}

async function read(reader: ReadableStreamDefaultReader<Uint8Array>) {
	const chunk = await reader.read()
	expect(chunk.done).toBe(false)
	expect(chunk.value).toBeInstanceOf(Uint8Array)
	return decoder.decode(chunk.value)
}

async function drain(reader: ReadableStreamDefaultReader<Uint8Array>) {
	let text = ''
	while (true) {
		const { done, value } = await reader.read()
		if (done) return text
		text += decoder.decode(value)
	}
}

function setup(abort = new AbortController()) {
	const completion = deferred<GenerationResult>()
	const request = new Request('http://localhost/api/admin/generate', { signal: abort.signal })
	const removeListener = vi.spyOn(request.signal, 'removeEventListener')
	const release = vi.fn()
	const stream = createGenerationStream(request)
	return { completion, request, abort, removeListener, release, ...stream }
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(1_000)
})

afterEach(() => {
	vi.clearAllTimers()
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('createGenerationStream', () => {
	test('streams early state and progress, then exactly one validated UTF-8 result', async () => {
		const s = setup()
		void s.sendResult(s.completion.promise, s.release)
		const reader = s.response.body!.getReader()
		expect(s.response).toBeInstanceOf(Response)
		expect(Object.fromEntries(s.response.headers)).toEqual({
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive',
			'x-accel-buffering': 'no'
		})
		let text = await read(reader)
		expect(events(text)).toEqual([{ type: 'state', data: { state: 'running' } }])
		text += await read(reader)
		expect(events(text)[1]).toEqual({
			type: 'phase',
			data: [
				{
					phase: 'preparation',
					status: 'running',
					started_at: 1_000,
					finished_at: null,
					message: 'Preparing generation'
				}
			]
		})

		vi.setSystemTime(1_100)
		s.progress({ phase: 'preparation', message: 'Reading attachments' })
		text += await read(reader)
		vi.setSystemTime(1_200)
		s.progress({ phase: 'generation', message: 'Waiting for provider' })
		text += await read(reader)
		vi.setSystemTime(1_300)
		s.progress({ phase: 'validation', message: 'Checking output' })
		text += await read(reader)
		expect(events(text).map((event) => event.type)).toEqual([
			'state',
			'phase',
			'phase',
			'phase',
			'phase'
		])
		expect(text).not.toMatch(/token|result|café/)
		expect(s.release).not.toHaveBeenCalled()
		expect(events(text).at(-1)).toEqual({
			type: 'phase',
			data: [
				{
					phase: 'preparation',
					status: 'completed',
					started_at: 1_000,
					finished_at: 1_200,
					message: 'Reading attachments'
				},
				{
					phase: 'generation',
					status: 'completed',
					started_at: 1_200,
					finished_at: 1_300,
					message: 'Waiting for provider'
				},
				{
					phase: 'validation',
					status: 'running',
					started_at: 1_300,
					finished_at: null,
					message: 'Checking output'
				}
			]
		})

		const next = reader.read()
		const received = vi.fn()
		void next.then(received)
		await vi.advanceTimersByTimeAsync(0)
		expect(received).not.toHaveBeenCalled()
		vi.setSystemTime(1_400)
		s.completion.resolve(result)
		text += decoder.decode((await next).value)
		text += await drain(reader)
		const frames = events(text)
		expect(frames.map((event) => event.type)).toEqual([
			'state',
			'phase',
			'phase',
			'phase',
			'phase',
			'phase',
			'done'
		])
		expect(frames.filter((event) => event.type === 'done')).toEqual([
			{ type: 'done', data: { state: 'completed', result } }
		])
		expect(frames.at(-2)).toMatchObject({
			type: 'phase',
			data: [
				{ status: 'completed' },
				{ status: 'completed' },
				{ status: 'completed', started_at: 1_300, finished_at: 1_400 }
			]
		})
		expect(frames.at(-1)?.type).toBe('done')
		expect(s.release).toHaveBeenCalledTimes(1)
		expect(vi.getTimerCount()).toBe(0)
		expect(s.removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
	})

	test('supports native Response.text() with multibyte output', async () => {
		const s = setup()
		void s.sendResult(Promise.resolve(result), s.release)
		const text = await s.response.text()
		expect(text).toContain('café\\n🧩 日本語')
		expect(events(text).at(-1)).toEqual({
			type: 'done',
			data: { state: 'completed', result }
		})
		expect(s.release).toHaveBeenCalledTimes(1)
	})

	test.each([0, -1])(
		'caps the serialized UTF-8 result at the byte boundary (%i)',
		async (offset) => {
			const originalLimit = DEFAULT_GENERATION_LIMITS.maxOutputBytes
			Object.assign(DEFAULT_GENERATION_LIMITS, {
				maxOutputBytes: Buffer.byteLength(JSON.stringify(result)) + offset
			})
			vi.spyOn(console, 'error').mockImplementation(() => {})
			try {
				const s = setup()
				void s.sendResult(Promise.resolve(result), s.release)
				const frames = events(await s.response.text())
				expect(frames.filter((frame) => frame.type === 'done')).toEqual([
					{
						type: 'done',
						data: offset === 0 ? { state: 'completed', result } : { state: 'failed' }
					}
				])
				if (offset < 0) {
					expect(frames).toContainEqual({
						type: 'error',
						data: { message: 'Generation failed. Please try again.' }
					})
					expect(JSON.stringify(frames)).not.toContain('markdown')
				}
				expect(s.release).toHaveBeenCalledOnce()
				expect(vi.getTimerCount()).toBe(0)
			} finally {
				Object.assign(DEFAULT_GENERATION_LIMITS, { maxOutputBytes: originalLimit })
			}
		}
	)

	test.each(['reject', 'throw'] as const)(
		'%s sends one failed done, a safe error and no result',
		async (mode) => {
			const secret = 'api-key=secret prompt=private filename=/private/scan.pdf provider-stack'
			const log = vi.spyOn(console, 'error').mockImplementation(() => {})
			const s = setup()
			const work =
				mode === 'throw'
					? (async () => {
							throw new Error(secret)
						})()
					: s.completion.promise
			void s.sendResult(work, s.release)
			if (mode === 'reject') {
				s.progress({ phase: 'validation', message: 'Checking output' })
				vi.setSystemTime(1_200)
				s.completion.reject(new Error(secret))
			}
			const text = await s.response.text()
			const frames = events(text)
			expect(frames.filter((event) => event.type === 'done')).toEqual([
				{ type: 'done', data: { state: 'failed' } }
			])
			expect(frames.filter((event) => event.type === 'error')).toEqual([
				{ type: 'error', data: { message: 'Generation failed. Please try again.' } }
			])
			const phase = frames.filter((event) => event.type === 'phase').at(-1)!
			expect(phase.data.at(-1)).toMatchObject({
				status: 'failed',
				finished_at: mode === 'reject' ? 1_200 : 1_000
			})
			expect(text).not.toMatch(/result|api-key|private|provider-stack/)
			expect(log).toHaveBeenCalledWith(
				'AI generation failed.',
				expect.objectContaining({
					phase: mode === 'reject' ? 'validation' : 'preparation',
					error: 'Error',
					stack: expect.stringContaining('stream.test.ts')
				})
			)
			expect(JSON.stringify(log.mock.calls)).not.toMatch(/api-key|prompt=private|provider-stack/)
			expect(s.release).toHaveBeenCalledTimes(1)
			expect(vi.getTimerCount()).toBe(0)
		}
	)

	test('reports the field and rule for a local schema failure without returning a result', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		const message = 'Generated frontmatter does not match schema: /title must be string'
		const s = setup()
		const work = (async () => {
			s.progress({ phase: 'validation', message: 'Validating metadata' })
			throw new GenerationValidationError(message)
		})()
		void s.sendResult(work, s.release)
		const frames = events(await s.response.text())
		expect(frames).toContainEqual({ type: 'error', data: { message } })
		expect(frames.at(-1)).toEqual({ type: 'done', data: { state: 'failed' } })
		expect(log).toHaveBeenCalledWith(
			'AI generation failed.',
			expect.objectContaining({
				phase: 'validation',
				validation: message,
				error: 'GenerationValidationError'
			})
		)
		expect(s.release).toHaveBeenCalledOnce()
	})

	test.each([false, true])('logs provider status safely (wrapped cause: %s)', async (wrapped) => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {})
		const s = setup()
		const work = (async () => {
			s.progress({ phase: 'generation', message: 'Generating content' })
			const providerError = Object.assign(new Error('private request\nsecond private line'), {
				status: 404,
				request: { apiKey: 'secret-key', contents: 'private prompt' }
			})
			if (wrapped) throw new Error('Could not upload attachment.', { cause: providerError })
			throw providerError
		})()
		void s.sendResult(work, s.release)
		await s.response.text()
		expect(log).toHaveBeenCalledWith(
			'AI generation failed.',
			expect.objectContaining({
				phase: 'generation',
				error: 'Error',
				status: 404,
				stack: expect.stringContaining('stream.test.ts')
			})
		)
		expect(JSON.stringify(log.mock.calls)).not.toMatch(/private|secret-key/)
	})

	test('heartbeats every 15 seconds through and beyond 300 seconds, not an operation deadline', async () => {
		const s = setup()
		void s.sendResult(s.completion.promise, s.release)
		const reader = s.response.body!.getReader()
		await read(reader)
		await read(reader)
		for (let tick = 0; tick < 21; tick++) {
			const next = reader.read()
			const received = vi.fn()
			void next.then(received)
			await vi.advanceTimersByTimeAsync(14_999)
			expect(received).not.toHaveBeenCalled()
			await vi.advanceTimersByTimeAsync(1)
			const chunk = await next
			expect(chunk.done).toBe(false)
			expect(decoder.decode(chunk.value)).toBe(': heartbeat\n\n')
			expect(s.release).not.toHaveBeenCalled()
		}
		s.completion.resolve(result)
		expect(events(await drain(reader)).at(-1)).toEqual({
			type: 'done',
			data: { state: 'completed', result }
		})
		expect(vi.getTimerCount()).toBe(0)
	})

	test('does not accumulate queued heartbeats behind an unread response', async () => {
		const s = setup()
		void s.sendResult(s.completion.promise, s.release)
		await vi.advanceTimersByTimeAsync(300_000)
		const reader = s.response.body!.getReader()
		expect(events(await read(reader))[0].type).toBe('state')
		expect(events(await read(reader))[0].type).toBe('phase')
		// Once the initial frames drain, at most one unread heartbeat can queue.
		await vi.advanceTimersByTimeAsync(300_000)
		expect(await read(reader)).toBe(': heartbeat\n\n')
		const received = vi.fn()
		const next = reader.read()
		void next.then(received)
		await vi.advanceTimersByTimeAsync(14_999)
		expect(received).not.toHaveBeenCalled()
		s.completion.resolve(result)
		expect(events(decoder.decode((await next).value))[0].type).toBe('phase')
		expect(events(await drain(reader))).toEqual([
			{ type: 'done', data: { state: 'completed', result } }
		])
	})

	test.each([
		['abort', 'success'],
		['abort', 'provider failure'],
		['abort', 'cleanup failure'],
		['cancel', 'success'],
		['cancel', 'provider failure'],
		['cancel', 'cleanup failure']
	] as const)(
		'%s detaches but retains the slot through %s and cleanup',
		async (disconnect, outcome) => {
			const provider = deferred<GenerationResult>()
			const cleanup = deferred<void>()
			const cleaning = vi.fn()
			const log = vi.spyOn(console, 'error').mockImplementation(() => {})
			const unhandled = vi.fn()
			process.on('unhandledRejection', unhandled)
			try {
				const s = setup()
				const work = (async () => {
					try {
						const value = await provider.promise
						s.progress({ phase: 'validation', message: 'Checking abandoned output' })
						return value
					} finally {
						cleaning()
						await cleanup.promise
					}
				})()
				void s.sendResult(work, s.release)
				const reader = s.response.body!.getReader()
				await read(reader)
				await read(reader)
				if (disconnect === 'abort') s.abort.abort()
				else await reader.cancel()
				expect(s.request.signal.aborted).toBe(disconnect === 'abort')
				expect(await reader.read()).toEqual({ done: true, value: undefined })
				expect(s.removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
				expect(vi.getTimerCount()).toBe(0)
				await vi.advanceTimersByTimeAsync(315_000)
				expect(cleaning).not.toHaveBeenCalled()
				expect(s.release).not.toHaveBeenCalled()

				if (outcome === 'provider failure') provider.reject(new Error('secret provider details'))
				else provider.resolve(result)
				await vi.advanceTimersByTimeAsync(0)
				expect(cleaning).toHaveBeenCalledTimes(1)
				expect(s.release).not.toHaveBeenCalled()
				if (outcome === 'cleanup failure') cleanup.reject(new Error('secret cleanup details'))
				else cleanup.resolve()
				await vi.advanceTimersByTimeAsync(0)
				expect(s.release).toHaveBeenCalledTimes(1)
				expect(await reader.read()).toEqual({ done: true, value: undefined })
				if (outcome === 'success') {
					expect(log).not.toHaveBeenCalled()
				} else {
					expect(log).toHaveBeenCalledWith(
						'AI generation failed.',
						expect.objectContaining({
							phase: outcome === 'provider failure' ? 'preparation' : 'validation',
							error: 'Error'
						})
					)
					expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret provider|secret cleanup/)
				}
				expect(unhandled).not.toHaveBeenCalled()
				expect(vi.getTimerCount()).toBe(0)
			} finally {
				process.off('unhandledRejection', unhandled)
			}
		}
	)

	test('an already-aborted accepted request still runs and releases only after settling', async () => {
		const abort = new AbortController()
		abort.abort()
		const s = setup(abort)
		let started = false
		const work = (async () => {
			started = true
			return await s.completion.promise
		})()
		void s.sendResult(work, s.release)
		expect(started).toBe(true)
		expect(await s.response.body!.getReader().read()).toEqual({ done: true, value: undefined })
		expect(s.removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
		expect(vi.getTimerCount()).toBe(0)
		expect(s.release).not.toHaveBeenCalled()
		s.completion.resolve(result)
		await vi.advanceTimersByTimeAsync(0)
		expect(s.release).toHaveBeenCalledTimes(1)
	})

	test.each(['initial', 'heartbeat'] as const)(
		'%s enqueue failure detaches listeners and timers, not work',
		async (when) => {
			const enqueue = vi.spyOn(ReadableStreamDefaultController.prototype, 'enqueue')
			const fail = () =>
				enqueue.mockImplementationOnce(() => {
					throw new Error('closed transport')
				})
			if (when === 'initial') fail()
			const s = setup()
			void s.sendResult(s.completion.promise, s.release)
			const reader = s.response.body!.getReader()
			if (when === 'heartbeat') {
				await read(reader)
				await read(reader)
				fail()
				await vi.advanceTimersByTimeAsync(15_000)
			}
			expect(await reader.read()).toEqual({ done: true, value: undefined })
			expect(s.removeListener).toHaveBeenCalledWith('abort', expect.any(Function))
			expect(vi.getTimerCount()).toBe(0)
			expect(s.release).not.toHaveBeenCalled()
			s.completion.resolve(result)
			await vi.advanceTimersByTimeAsync(0)
			expect(s.release).toHaveBeenCalledTimes(1)
		}
	)
})
