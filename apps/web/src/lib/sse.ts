import { EventSourceParserStream, type EventSourceMessage } from 'eventsource-parser/stream'

export type JsonEvent = { type: string; data: unknown }

function parseJsonEvent({ event, data }: EventSourceMessage): JsonEvent {
	try {
		return { type: event || 'message', data: JSON.parse(data) }
	} catch {
		throw new Error('Invalid SSE event data.')
	}
}

/** Read JSON SSE frames. Aborting stops observation, not the server's work. */
export async function* readJsonEvents(
	response: Response,
	signal: AbortSignal
): AsyncGenerator<JsonEvent> {
	if (!response.body) {
		if (signal.aborted) return
		throw new Error('SSE response has no stream.')
	}
	if (signal.aborted) {
		await response.body.cancel().catch(() => {})
		return
	}
	const events = response.body
		.pipeThrough(new TextDecoderStream('utf-8', { fatal: true }))
		.pipeThrough(new EventSourceParserStream(), { signal })
	const reader = events.getReader()
	try {
		while (!signal.aborted) {
			const { value, done } = await reader.read()
			if (done || signal.aborted) return
			yield parseJsonEvent(value)
		}
	} catch (cause) {
		if (!signal.aborted) throw cause
	} finally {
		await reader.cancel().catch(() => {})
		reader.releaseLock()
	}
}
