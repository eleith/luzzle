import { HEARTBEAT_MS } from './constants'

export const SSE_HEADERS = {
	'Content-Type': 'text/event-stream',
	'Cache-Control': 'no-cache',
	Connection: 'keep-alive',
	'X-Accel-Buffering': 'no'
}

export function encodeEvent(event: string, data: unknown, id?: string): string {
	const lines = [`event: ${event}`]
	if (id) lines.push(`id: ${id}`)
	lines.push(`data: ${JSON.stringify(data)}`)
	return lines.join('\n') + '\n\n'
}

/** Owns the response observer, not the work producing its events. */
export function createEventStream(request: Request) {
	const observer = new AbortController()
	const encoder = new TextEncoder()
	let controller: ReadableStreamDefaultController<Uint8Array>
	let heartbeat: ReturnType<typeof setInterval> | undefined

	function close() {
		if (observer.signal.aborted) return
		clearInterval(heartbeat)
		request.signal.removeEventListener('abort', close)
		observer.abort()
		try {
			controller.close()
		} catch {
			// Reader cancellation or an enqueue failure may already have closed it.
		}
	}

	function send(text: string) {
		if (observer.signal.aborted) return
		try {
			controller.enqueue(encoder.encode(text))
		} catch {
			close()
		}
	}

	const stream = new ReadableStream<Uint8Array>({
		start(value) {
			controller = value
			request.signal.addEventListener('abort', close, { once: true })
			if (request.signal.aborted) {
				close()
				return
			}
			heartbeat = setInterval(() => {
				// Don't accumulate heartbeats behind an unread response.
				if ((controller.desiredSize ?? 0) > 0) send(': heartbeat\n\n')
			}, HEARTBEAT_MS)
		},
		cancel: close
	})

	return {
		response: new Response(stream, { headers: SSE_HEADERS }),
		// Only observation ends here. Producers must not pass this signal to accepted work.
		signal: observer.signal,
		emit(event: string, data: unknown, id?: string) {
			if (!observer.signal.aborted) send(encodeEvent(event, data, id))
		},
		close
	}
}
