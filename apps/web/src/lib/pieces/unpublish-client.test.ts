import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { encodeEvent, SSE_HEADERS } from '$lib/server/sse'
import { submitUnpublish } from './unpublish-client'

const fetchMock = vi.fn<typeof fetch>()
const encoder = new TextEncoder()
const filePath = 'books/源 #?%.books.md'
const completed = () =>
	encodeEvent('done', {
		workflowName: 'Unpublish',
		state: 'completed',
		result: 'ok',
		errors: null
	})

function accepted() {
	return new Response(JSON.stringify({ jobId: 'job-1' }), {
		headers: { 'Content-Type': 'application/json' }
	})
}

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
		send,
		cancel,
		close: () => controller.close()
	}
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock))
afterEach(() => {
	fetchMock.mockReset()
	vi.unstubAllGlobals()
})

test('posts the exact file and waits for its own completion, not just admission', async () => {
	const source = stream(encodeEvent('state', { workflowName: 'Unpublish', state: 'waiting' }))
	fetchMock.mockResolvedValueOnce(accepted()).mockResolvedValueOnce(source.response)
	const observer = new AbortController()
	let settled = false
	const pending = submitUnpublish(filePath, observer.signal).then((result) => {
		settled = true
		return result
	})
	await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
	expect(settled).toBe(false)
	expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/unpublish', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ filePath }),
		signal: observer.signal
	})
	expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/publish/job-1/stream', {
		headers: { Accept: 'text/event-stream' },
		signal: observer.signal
	})
	source.send(completed())
	await expect(pending).resolves.toEqual({ state: 'completed', jobId: 'job-1' })
})

test('does not adopt a conflicting job or submit again', async () => {
	fetchMock.mockResolvedValue(
		new Response(JSON.stringify({ jobId: 'foreign-job' }), { status: 409 })
	)
	const result = await submitUnpublish(filePath, new AbortController().signal)
	expect(result).toMatchObject({ state: 'failed', reason: 'busy' })
	expect(result?.jobId).toBeUndefined()
	expect(fetchMock).toHaveBeenCalledOnce()
})

test('preserves serialized cleanup diagnostics without retrying the job', async () => {
	const detail = 'Unpublish cleanup incomplete:\nremote cover.png: deletion refused'
	const source = stream(
		encodeEvent('done', {
			workflowName: 'Unpublish',
			state: 'failed',
			result: null,
			errors: [JSON.stringify({ message: detail })]
		})
	)
	fetchMock.mockResolvedValueOnce(accepted()).mockResolvedValueOnce(source.response)
	await expect(submitUnpublish(filePath, new AbortController().signal)).resolves.toMatchObject({
		state: 'failed',
		reason: 'job',
		jobId: 'job-1',
		detail
	})
	expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('rejects a different workflow rather than claiming Unpublish succeeded', async () => {
	const source = stream(
		encodeEvent('done', {
			workflowName: 'Publish',
			state: 'completed',
			result: 'ok'
		})
	)
	fetchMock.mockResolvedValueOnce(accepted()).mockResolvedValueOnce(source.response)
	await expect(submitUnpublish(filePath, new AbortController().signal)).resolves.toMatchObject({
		state: 'failed',
		reason: 'response',
		jobId: 'job-1'
	})
})

test('reports an interrupted stream as unknown completion and does not reconnect', async () => {
	const source = stream(encodeEvent('state', { workflowName: 'Unpublish', state: 'running' }))
	source.close()
	fetchMock.mockResolvedValueOnce(accepted()).mockResolvedValueOnce(source.response)
	await expect(submitUnpublish(filePath, new AbortController().signal)).resolves.toMatchObject({
		state: 'failed',
		reason: 'connection',
		jobId: 'job-1'
	})
	expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('reports authentication failure without observing a job', async () => {
	fetchMock.mockResolvedValue(new Response('Unauthorized', { status: 401 }))
	const result = await submitUnpublish(filePath, new AbortController().signal)
	expect(result).toMatchObject({ state: 'failed', reason: 'sign-in' })
	expect(result?.jobId).toBeUndefined()
	expect(fetchMock).toHaveBeenCalledOnce()
})

test('distinguishes authentication loss after admission from a worker failure', async () => {
	fetchMock
		.mockResolvedValueOnce(accepted())
		.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
	await expect(submitUnpublish(filePath, new AbortController().signal)).resolves.toMatchObject({
		state: 'failed',
		reason: 'sign-in',
		jobId: 'job-1'
	})
})

test('reports request diagnostics without treating them as success', async () => {
	fetchMock.mockResolvedValue(new Response('queue unavailable', { status: 500 }))
	await expect(submitUnpublish(filePath, new AbortController().signal)).resolves.toMatchObject({
		state: 'failed',
		reason: 'request',
		detail: 'queue unavailable'
	})
	expect(fetchMock).toHaveBeenCalledOnce()
})

test('requires a job ID before opening a status stream', async () => {
	fetchMock.mockResolvedValue(new Response(JSON.stringify({ result: 'ok' })))
	await expect(submitUnpublish(filePath, new AbortController().signal)).resolves.toMatchObject({
		state: 'failed',
		reason: 'response'
	})
	expect(fetchMock).toHaveBeenCalledOnce()
})

test('detaching stops observation, not the admitted server job', async () => {
	const source = stream()
	fetchMock.mockResolvedValueOnce(accepted()).mockResolvedValueOnce(source.response)
	const observer = new AbortController()
	const pending = submitUnpublish(filePath, observer.signal)
	await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
	observer.abort()
	await expect(pending).resolves.toBeUndefined()
	expect(fetchMock).toHaveBeenCalledTimes(2)
	expect(source.cancel).toHaveBeenCalledOnce()
})
