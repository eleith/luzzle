import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { HEARTBEAT_MS } from './constants.js'
import { createEventStream, encodeEvent } from './sse.js'

describe('encodeEvent', () => {
	test('preserves unicode and JSON-escapes newlines in a single data line', () => {
		expect(encodeEvent('log', { message: 'café 🧩\nnext\r\n"quoted"' })).toBe(
			'event: log\ndata: {"message":"café 🧩\\nnext\\r\\n\\"quoted\\""}\n\n'
		)
	})

	test('puts the cursor id between the event and data lines', () => {
		expect(encodeEvent('cursor', { sync: 7, publish: 2 }, '{"sync":7,"publish":2}')).toBe(
			'event: cursor\nid: {"sync":7,"publish":2}\ndata: {"sync":7,"publish":2}\n\n'
		)
	})

	test.each([undefined, ''])('omits a falsy id (%s)', (id) => {
		expect(encodeEvent('done', null, id)).toBe('event: done\ndata: null\n\n')
	})

	test('includes a truthy zero string id', () => {
		expect(encodeEvent('state', [], '0')).toBe('event: state\nid: 0\ndata: []\n\n')
	})
})

describe('createEventStream', () => {
	const streams: ReturnType<typeof createEventStream>[] = []

	function open(request = new Request('http://localhost/events')) {
		const stream = createEventStream(request)
		streams.push(stream)
		return stream
	}

	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		for (const stream of streams.splice(0)) stream.close()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	test('returns a native response with the existing SSE headers', () => {
		const { response } = open()

		expect(response).toBeInstanceOf(Response)
		expect(response.status).toBe(200)
		expect(Object.fromEntries(response.headers)).toEqual({
			'cache-control': 'no-cache',
			connection: 'keep-alive',
			'content-type': 'text/event-stream',
			'x-accel-buffering': 'no'
		})
	})

	test('encodes unicode as bytes consumable by native Response.text()', async () => {
		const { response, emit, close } = open()
		emit('log', { message: 'café 🧩 日本語\nnext\r\n"quoted"' })
		close()

		await expect(response.text()).resolves.toBe(
			'event: log\ndata: {"message":"café 🧩 日本語\\nnext\\r\\n\\"quoted\\""}\n\n'
		)
	})

	test('preserves cursor ids and event framing unchanged on the wire', async () => {
		const { response, emit, close } = open()
		emit('cursor', { sync: 7, publish: 2 }, '{"sync":7,"publish":2}')
		emit('state', [], '0')
		emit('done', null)
		close()

		await expect(response.text()).resolves.toBe(
			'event: cursor\nid: {"sync":7,"publish":2}\ndata: {"sync":7,"publish":2}\n\n' +
				'event: state\nid: 0\ndata: []\n\n' +
				'event: done\ndata: null\n\n'
		)
	})

	test('keeps a quiet observer alive with a byte heartbeat every 15 seconds', async () => {
		const { response, signal } = open()
		const reader = response.body!.getReader()
		const received = vi.fn()
		const first = reader.read().then((chunk) => {
			received(chunk)
			return chunk
		})

		expect(HEARTBEAT_MS).toBe(15_000)
		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS - 1)
		expect(received).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)
		await expect(first).resolves.toEqual({
			done: false,
			value: new TextEncoder().encode(': heartbeat\n\n')
		})

		const second = reader.read()
		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS)
		await expect(second).resolves.toEqual({
			done: false,
			value: new TextEncoder().encode(': heartbeat\n\n')
		})
		expect(signal.aborted).toBe(false)
		await reader.cancel()
	})

	test('has no overall stream timeout even after a day without producer events', async () => {
		const { response, emit, signal } = open()
		const reader = response.body!.getReader()

		await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000)
		expect(signal.aborted).toBe(false)
		expect(vi.getTimerCount()).toBe(1)
		await expect(reader.read()).resolves.toEqual({
			done: false,
			value: new TextEncoder().encode(': heartbeat\n\n')
		})

		emit('done', { ok: true })
		await expect(reader.read()).resolves.toEqual({
			done: false,
			value: new TextEncoder().encode('event: done\ndata: {"ok":true}\n\n')
		})
		await reader.cancel()
	})

	test('does not accumulate unread heartbeats behind events or other heartbeats', async () => {
		const enqueue = vi.spyOn(ReadableStreamDefaultController.prototype, 'enqueue')
		const { response, emit } = open()
		const reader = response.body!.getReader()

		emit('state', { ready: true })
		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 100)
		expect(enqueue).toHaveBeenCalledTimes(1)
		await expect(reader.read()).resolves.toEqual({
			done: false,
			value: new TextEncoder().encode('event: state\ndata: {"ready":true}\n\n')
		})

		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 100)
		expect(enqueue).toHaveBeenCalledTimes(2)
		await expect(reader.read()).resolves.toEqual({
			done: false,
			value: new TextEncoder().encode(': heartbeat\n\n')
		})

		// Draining the queue allows future heartbeats, not a backlog of old ones.
		const received = vi.fn()
		const next = reader.read().then(received)
		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS - 1)
		expect(received).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)
		await next
		expect(enqueue).toHaveBeenCalledTimes(3)
		await reader.cancel()
	})

	test.each([
		'explicit close',
		'request abort',
		'reader cancellation',
		'event enqueue failure',
		'heartbeat enqueue failure'
	])('%s ends only observation and cleans up exactly once', async (cause) => {
		const abort = new AbortController()
		const request = new Request('http://localhost/events', { signal: abort.signal })
		const removeListener = vi.spyOn(request.signal, 'removeEventListener')
		const enqueue = vi.spyOn(ReadableStreamDefaultController.prototype, 'enqueue')
		const closeController = vi.spyOn(ReadableStreamDefaultController.prototype, 'close')
		const { response, emit, close, signal } = open(request)
		const reader = response.body!.getReader()
		const observerClosed = vi.fn()
		signal.addEventListener('abort', observerClosed)
		const pending = reader.read()

		expect(signal).not.toBe(request.signal)
		expect(signal.aborted).toBe(false)
		expect(vi.getTimerCount()).toBe(1)

		switch (cause) {
			case 'explicit close':
				close()
				break
			case 'request abort':
				abort.abort()
				break
			case 'reader cancellation':
				await reader.cancel()
				break
			default:
				// Keep native Request/Response/streams; fail only the synchronous enqueue.
				enqueue.mockImplementationOnce(() => {
					throw new TypeError('observer is no longer readable')
				})
				if (cause === 'event enqueue failure') {
					expect(() => emit('state', {})).not.toThrow()
				} else {
					await vi.advanceTimersByTimeAsync(HEARTBEAT_MS)
				}
		}

		expect(signal.aborted).toBe(true)
		expect(request.signal.aborted).toBe(cause === 'request abort')
		expect(observerClosed).toHaveBeenCalledTimes(1)
		expect(removeListener).toHaveBeenCalledExactlyOnceWith('abort', close)
		expect(closeController).toHaveBeenCalledTimes(1)
		expect(vi.getTimerCount()).toBe(0)
		await expect(pending).resolves.toEqual({ done: true, value: undefined })

		const enqueueCalls = enqueue.mock.calls.length
		const toJSON = vi.fn(() => {
			throw new Error('closed observers must not serialize frames')
		})
		expect(() => emit('late', { toJSON }, 'late-cursor')).not.toThrow()
		close()
		close()
		abort.abort()
		await reader.cancel()
		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 100)

		expect(toJSON).not.toHaveBeenCalled()
		expect(enqueue).toHaveBeenCalledTimes(enqueueCalls)
		expect(observerClosed).toHaveBeenCalledTimes(1)
		expect(removeListener).toHaveBeenCalledTimes(1)
		expect(closeController).toHaveBeenCalledTimes(1)
		expect(vi.getTimerCount()).toBe(0)
		await expect(reader.read()).resolves.toEqual({ done: true, value: undefined })
	})

	test('an already-aborted request closes immediately without starting any heartbeat', async () => {
		const abort = new AbortController()
		abort.abort()
		const request = new Request('http://localhost/events', { signal: abort.signal })
		const removeListener = vi.spyOn(request.signal, 'removeEventListener')
		const interval = vi.spyOn(globalThis, 'setInterval')
		const enqueue = vi.spyOn(ReadableStreamDefaultController.prototype, 'enqueue')
		const { response, emit, close, signal } = open(request)
		const toJSON = vi.fn(() => {
			throw new Error('already-closed observers must not serialize frames')
		})

		expect(signal.aborted).toBe(true)
		expect(removeListener).toHaveBeenCalledExactlyOnceWith('abort', close)
		expect(interval).not.toHaveBeenCalled()
		expect(() => emit('late', { toJSON })).not.toThrow()
		close()
		await vi.advanceTimersByTimeAsync(HEARTBEAT_MS * 100)

		expect(toJSON).not.toHaveBeenCalled()
		expect(enqueue).not.toHaveBeenCalled()
		expect(removeListener).toHaveBeenCalledTimes(1)
		expect(vi.getTimerCount()).toBe(0)
		await expect(response.text()).resolves.toBe('')
	})
})
