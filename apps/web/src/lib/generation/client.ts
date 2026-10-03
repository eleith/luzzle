import { readJsonEvents, type JsonEvent } from '$lib/sse'
import type { GenerationEvent, GenerationResult } from './types'
import type { ProgressPhase } from '$lib/components/progress'

function isObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function generationEvent({ type, data }: JsonEvent): GenerationEvent {
	if (
		type === 'phase' &&
		Array.isArray(data) &&
		data.every(
			(phase) =>
				isObject(phase) && typeof phase.phase === 'string' && typeof phase.status === 'string'
		)
	) {
		return { type, data: data as ProgressPhase[] }
	}
	if (isObject(data)) {
		if (type === 'state' && data.state === 'running') {
			return { type, data: { state: 'running' } }
		}
		if (type === 'error' && typeof data.message === 'string') {
			return { type, data: { message: data.message } }
		}
		if (type === 'done') {
			if (data.state === 'failed') return { type, data: { state: 'failed' } }
			if (
				data.state === 'completed' &&
				isObject(data.result) &&
				typeof data.result.markdown === 'string' &&
				data.result.markdown.trim().length > 0
			) {
				return { type, data: { state: 'completed', result: { markdown: data.result.markdown } } }
			}
		}
	}
	throw new Error('Invalid generation response.')
}

async function responseError(response: Response): Promise<Error> {
	if (response.redirected) {
		await response.body?.cancel().catch(() => {})
		return new Error('Please sign in again before generating.')
	}
	const data = await response.json().catch(() => null)
	const message = data?.message ?? data?.error?.message
	return new Error(
		typeof message === 'string' ? message : `Generation request failed (${response.status}).`
	)
}

/** Detach stops browser observation only; accepted server work continues. */
export function startGeneration(form: FormData, onEvent: (event: GenerationEvent) => void) {
	const observer = new AbortController()

	async function run(): Promise<GenerationResult | undefined> {
		try {
			const response = await fetch('/api/admin/generate', {
				method: 'POST',
				body: form,
				signal: observer.signal
			})
			if (observer.signal.aborted) {
				await response.body?.cancel()
				return
			}
			if (
				!response.ok ||
				response.redirected ||
				!response.headers.get('content-type')?.startsWith('text/event-stream')
			) {
				throw await responseError(response)
			}
			let failure = 'Generation failed. Please try again.'
			for await (const frame of readJsonEvents(response, observer.signal)) {
				if (observer.signal.aborted) return
				const event = generationEvent(frame)
				onEvent(event)
				if (observer.signal.aborted) return
				if (event.type === 'error') failure = event.data.message
				if (event.type === 'done') {
					if (event.data.state === 'failed') throw new Error(failure)
					return event.data.result
				}
			}
			if (!observer.signal.aborted) {
				throw new Error('Generation connection ended before completion. Please try again.')
			}
		} catch (cause) {
			if (!observer.signal.aborted) throw cause
		}
	}

	return {
		result: run(),
		detach() {
			observer.abort()
		}
	}
}
