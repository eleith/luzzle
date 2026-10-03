import { describe, expect, it, vi } from 'vitest'
import { readJsonEvents, type JsonEvent } from './sse'

const encoder = new TextEncoder()

function stream(text = '') {
	let controller: ReadableStreamDefaultController<Uint8Array>
	const cancel = vi.fn()
	const body = new ReadableStream<Uint8Array>({
		start(value) {
			controller = value
		},
		cancel
	})
	const bytes = (value: Uint8Array) => controller.enqueue(value)
	if (text) bytes(encoder.encode(text))
	return {
		response: new Response(body),
		body,
		cancel,
		bytes,
		close: () => controller.close(),
		fail: (error: Error) => controller.error(error)
	}
}

async function collect(response: Response, signal = new AbortController().signal) {
	const events: JsonEvent[] = []
	for await (const event of readJsonEvents(response, signal)) events.push(event)
	return events
}

describe('readJsonEvents', () => {
	it.each([1, 7, 61])('decodes CRLF frames and UTF-8 split into %i-byte chunks', async (size) => {
		const source = stream()
		const bytes = encoder.encode(
			': heartbeat\r\n\r\nevent: update\r\ndata: {"text":"café 🧩 日本語"}\r\n\r\n' +
				'event: finished\r\ndata: true\r\n\r\n'
		)
		for (let i = 0; i < bytes.length; i += size) source.bytes(bytes.slice(i, i + size))
		source.close()
		await expect(collect(source.response)).resolves.toEqual([
			{ type: 'update', data: { text: 'café 🧩 日本語' } },
			{ type: 'finished', data: true }
		])
		expect(source.body.locked).toBe(false)
	})

	it.each(['\n', '\r\n', '\r'])(
		'handles multiline data, comments, and default events (%j)',
		async (newline) => {
			const source = stream(
				[
					': heartbeat',
					'',
					'event: ignored-without-data',
					'',
					'id: unused',
					'retry: 1000',
					'unknown: ignored',
					'data: {',
					': comment inside frame',
					'data: "value": 42}',
					'',
					'event: first',
					'event: last',
					'data:null',
					'',
					'event:',
					'data: "default"',
					'',
					''
				].join(newline)
			)
			source.close()
			await expect(collect(source.response)).resolves.toEqual([
				{ type: 'message', data: { value: 42 } },
				{ type: 'last', data: null },
				{ type: 'message', data: 'default' }
			])
		}
	)

	it('dispatches a CR-terminated frame without waiting for another chunk or EOF', async () => {
		const source = stream('data: 1\r\r')
		const events = readJsonEvents(source.response, new AbortController().signal)
		await expect(events.next()).resolves.toEqual({
			done: false,
			value: { type: 'message', data: 1 }
		})
		await events.return(undefined)
		expect(source.cancel).toHaveBeenCalledOnce()
		await vi.waitFor(() => expect(source.body.locked).toBe(false))
	})

	it('does not dispatch an unterminated frame at EOF', async () => {
		const source = stream('data: 1\n\ndata: 2\n')
		source.close()
		await expect(collect(source.response)).resolves.toEqual([{ type: 'message', data: 1 }])
		expect(source.body.locked).toBe(false)
	})

	it('cancels and releases the reader when the consumer stops early', async () => {
		const source = stream('data: 1\n\ndata: 2\n\n')
		for await (const event of readJsonEvents(source.response, new AbortController().signal)) {
			expect(event.data).toBe(1)
			break
		}
		expect(source.cancel).toHaveBeenCalledOnce()
		await vi.waitFor(() => expect(source.body.locked).toBe(false))
	})

	it.each(['data: {broken\n\n', 'data\n\n'])(
		'rejects invalid JSON and releases the reader (%#)',
		async (text) => {
			const source = stream(text)
			await expect(collect(source.response)).rejects.toThrow('Invalid SSE event data.')
			expect(source.cancel).toHaveBeenCalledOnce()
			expect(source.body.locked).toBe(false)
		}
	)

	it.each([false, true])('rejects invalid or incomplete UTF-8 (EOF: %s)', async (eof) => {
		const source = stream()
		source.bytes(new Uint8Array(eof ? [0xc3] : [0xff]))
		if (eof) source.close()
		await expect(collect(source.response)).rejects.toBeInstanceOf(TypeError)
		expect(source.body.locked).toBe(false)
	})

	it('aborts a pending read cleanly', async () => {
		const source = stream()
		const observer = new AbortController()
		const pending = collect(source.response, observer.signal)
		expect(source.body.locked).toBe(true)
		observer.abort()
		await expect(pending).resolves.toEqual([])
		expect(source.cancel).toHaveBeenCalledOnce()
		expect(source.body.locked).toBe(false)
	})

	it('closes a response without reading when already aborted', async () => {
		const source = stream('data: 1\n\n')
		await expect(collect(source.response, AbortSignal.abort())).resolves.toEqual([])
		expect(source.cancel).toHaveBeenCalledOnce()
		expect(source.body.locked).toBe(false)
	})

	it('discards buffered events after abort', async () => {
		const source = stream('data: 1\n\ndata: 2\n\n')
		const observer = new AbortController()
		const events: JsonEvent[] = []
		for await (const event of readJsonEvents(source.response, observer.signal)) {
			events.push(event)
			observer.abort()
		}
		expect(events).toEqual([{ type: 'message', data: 1 }])
		expect(source.cancel).toHaveBeenCalledOnce()
		await vi.waitFor(() => expect(source.body.locked).toBe(false))
	})

	it('propagates a read failure and releases the reader', async () => {
		const source = stream()
		const pending = collect(source.response)
		source.fail(new Error('Connection lost'))
		await expect(pending).rejects.toThrow('Connection lost')
		expect(source.body.locked).toBe(false)
	})

	it('releases the reader even if cancellation fails', async () => {
		const source = stream('data: 1\n\n')
		source.cancel.mockRejectedValue(new Error('Already disconnected'))
		for await (const event of readJsonEvents(source.response, new AbortController().signal)) {
			expect(event.data).toBe(1)
			break
		}
		await vi.waitFor(() => expect(source.body.locked).toBe(false))
	})

	it('rejects a missing response body unless observation was aborted', async () => {
		await expect(collect(new Response(null))).rejects.toThrow('no stream')
		await expect(collect(new Response(null), AbortSignal.abort())).resolves.toEqual([])
	})
})
