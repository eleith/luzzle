import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encodeEvent, SSE_HEADERS } from '$lib/server/sse'
import { startGeneration } from './client'
import type { GenerationResult } from './types'

const fetchMock = vi.fn<typeof fetch>()
const encoder = new TextEncoder()
const result: GenerationResult = { markdown: '---\ntitle: café 🧩 日本語\n---\n' }
const completed = (value: GenerationResult = result) =>
	encodeEvent('done', { state: 'completed', result: value })
const phase = [
	{ phase: 'generate', status: 'running', started_at: 1, finished_at: null, message: null }
]

function stream(text = '') {
	let controller: ReadableStreamDefaultController<Uint8Array>
	const cancel = vi.fn()
	const body = new ReadableStream<Uint8Array>({
		start(value) {
			controller = value
		},
		cancel
	})
	const send = (value: string) => controller.enqueue(encoder.encode(value))
	if (text) send(text)
	return {
		response: new Response(body, { headers: SSE_HEADERS }),
		body,
		cancel,
		send,
		close: () => controller.close()
	}
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock))
afterEach(() => {
	fetchMock.mockReset()
	vi.unstubAllGlobals()
})

describe('startGeneration', () => {
	it('posts multipart input and adapts generation events', async () => {
		const source = stream(
			encodeEvent('state', { state: 'running' }) + encodeEvent('phase', phase) + completed()
		)
		fetchMock.mockResolvedValue(source.response)
		const onEvent = vi.fn()
		const form = new FormData()
		form.set('prompt', 'hello')
		await expect(startGeneration(form, onEvent).result).resolves.toEqual(result)
		expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual(['state', 'phase', 'done'])
		expect(onEvent).toHaveBeenNthCalledWith(2, { type: 'phase', data: phase })
		expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/admin/generate', {
			method: 'POST',
			body: form,
			signal: expect.any(AbortSignal)
		})
	})

	it('delivers phases while completion is still pending', async () => {
		const source = stream(encodeEvent('phase', phase))
		fetchMock.mockResolvedValue(source.response)
		const onEvent = vi.fn()
		const operation = startGeneration(new FormData(), onEvent)
		const settled = vi.fn()
		void operation.result.then(settled)
		await vi.waitFor(() => expect(onEvent).toHaveBeenCalledOnce())
		expect(settled).not.toHaveBeenCalled()
		source.send(completed())
		await expect(operation.result).resolves.toEqual(result)
	})

	it('returns the complete editor document from the shared LF frame encoder', async () => {
		fetchMock.mockResolvedValue(stream(completed()).response)
		await expect(startGeneration(new FormData(), vi.fn()).result).resolves.toEqual(result)
	})

	it('delivers error and failed done events, rejects with the server message, and never reconnects', async () => {
		const source = stream(
			encodeEvent('error', { message: 'Model unavailable' }) +
				encodeEvent('done', { state: 'failed' })
		)
		fetchMock.mockResolvedValue(source.response)
		const onEvent = vi.fn()
		await expect(startGeneration(new FormData(), onEvent).result).rejects.toThrow(
			'Model unavailable'
		)
		expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual(['error', 'done'])
		expect(source.cancel).toHaveBeenCalledOnce()
		expect(source.body.locked).toBe(false)
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it.each([
		encodeEvent('state', null),
		encodeEvent('state', { state: 'unknown' }),
		encodeEvent('phase', {}),
		encodeEvent('phase', [null]),
		encodeEvent('phase', [{ phase: 'generate' }]),
		encodeEvent('error', { message: 42 }),
		encodeEvent('done', { state: 'completed', result: { markdown: 42 } }),
		encodeEvent('done', { state: 'completed', result: {} }),
		encodeEvent('done', { state: 'completed', result: { markdown: '  ' } })
	])('rejects malformed generation payloads before callbacks (%#)', async (text) => {
		const source = stream(text)
		fetchMock.mockResolvedValue(source.response)
		const onEvent = vi.fn()
		await expect(startGeneration(new FormData(), onEvent).result).rejects.toThrow()
		expect(onEvent).not.toHaveBeenCalled()
		expect(source.cancel).toHaveBeenCalledOnce()
		expect(source.body.locked).toBe(false)
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it('uses the default failure message when done fails without an error event', async () => {
		fetchMock.mockResolvedValue(stream(encodeEvent('done', { state: 'failed' })).response)
		await expect(startGeneration(new FormData(), vi.fn()).result).rejects.toThrow(
			'Generation failed. Please try again.'
		)
	})

	it('does not validate every optional phase detail from the trusted API', async () => {
		const phases = [{ phase: 'generate', status: 'running' }]
		fetchMock.mockResolvedValue(stream(encodeEvent('phase', phases) + completed()).response)
		const onEvent = vi.fn()
		await expect(startGeneration(new FormData(), onEvent).result).resolves.toEqual(result)
		expect(onEvent).toHaveBeenCalledWith({ type: 'phase', data: phases })
	})

	it('rejects EOF without done instead of reconnecting', async () => {
		const source = stream(encodeEvent('phase', phase))
		source.close()
		fetchMock.mockResolvedValue(source.response)
		await expect(startGeneration(new FormData(), vi.fn()).result).rejects.toThrow(
			/before completion/i
		)
		expect(source.body.locked).toBe(false)
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it.each<[Response, string]>([
		[Response.json({ message: 'Upload too large' }, { status: 413 }), 'Upload too large'],
		[new Response('<html>Proxy error</html>', { status: 502 }), '502'],
		[new Response('<html>Sign in</html>', { headers: { 'Content-Type': 'text/html' } }), '200'],
		[Object.defineProperty(new Response('sign in'), 'redirected', { value: true }), 'sign in']
	])('rejects non-SSE HTTP responses (%#)', async (response, message) => {
		fetchMock.mockResolvedValue(response)
		const onEvent = vi.fn()
		await expect(startGeneration(new FormData(), onEvent).result).rejects.toThrow(message)
		expect(onEvent).not.toHaveBeenCalled()
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it('propagates fetch rejection without retrying', async () => {
		fetchMock.mockRejectedValue(new TypeError('Network unavailable'))
		await expect(startGeneration(new FormData(), vi.fn()).result).rejects.toThrow(
			'Network unavailable'
		)
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it('detaches a pending fetch and discards its late successful response', async () => {
		const pending = Promise.withResolvers<Response>()
		fetchMock.mockReturnValue(pending.promise)
		const onEvent = vi.fn()
		const operation = startGeneration(new FormData(), onEvent)
		operation.detach()
		const source = stream(completed())
		pending.resolve(source.response)
		await expect(operation.result).resolves.toBeUndefined()
		expect(onEvent).not.toHaveBeenCalled()
		expect(source.cancel).toHaveBeenCalledOnce()
		expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it('detaches a pending reader, releases observation, and returns no result', async () => {
		const source = stream(encodeEvent('phase', phase))
		fetchMock.mockResolvedValue(source.response)
		const onEvent = vi.fn()
		const operation = startGeneration(new FormData(), onEvent)
		await vi.waitFor(() => expect(onEvent).toHaveBeenCalledOnce())
		// Queue completion, then detach before its pending read resumes.
		source.send(completed())
		operation.detach()
		await expect(operation.result).resolves.toBeUndefined()
		expect(onEvent).toHaveBeenCalledOnce()
		expect(source.cancel).toHaveBeenCalledOnce()
		expect(source.body.locked).toBe(false)
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it('stops buffered callbacks when detached from inside a callback', async () => {
		const source = stream(encodeEvent('phase', phase) + completed())
		fetchMock.mockResolvedValue(source.response)
		const onEvent = vi.fn(() => operation.detach())
		const operation = startGeneration(new FormData(), onEvent)
		await expect(operation.result).resolves.toBeUndefined()
		expect(onEvent).toHaveBeenCalledOnce()
		expect(source.cancel).toHaveBeenCalledOnce()
		expect(source.body.locked).toBe(false)
	})

	it('keeps an old operation’s late failure from firing stale UI callbacks after a new result', async () => {
		const pending = Promise.withResolvers<Response>()
		fetchMock
			.mockReturnValueOnce(pending.promise)
			.mockResolvedValueOnce(stream(completed()).response)
		const staleEvent = vi.fn()
		const staleResult = vi.fn()
		const staleFailure = vi.fn()
		const old = startGeneration(new FormData(), staleEvent)
		const oldUI = old.result.then((value) => {
			if (value) staleResult(value)
		}, staleFailure)
		old.detach()
		const currentEvent = vi.fn()
		await expect(startGeneration(new FormData(), currentEvent).result).resolves.toEqual(result)
		pending.reject(new Error('Late network failure'))
		await oldUI
		expect(staleEvent).not.toHaveBeenCalled()
		expect(staleResult).not.toHaveBeenCalled()
		expect(staleFailure).not.toHaveBeenCalled()
		expect(currentEvent).toHaveBeenCalledOnce()
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})
})
