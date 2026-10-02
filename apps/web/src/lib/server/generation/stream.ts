import { DEFAULT_GENERATION_LIMITS, type GenerationProgress } from '@luzzle/core'
import type { ProgressPhase } from '$lib/components/progress'
import type { GenerationEvent } from '$lib/generation/types'
import { createEventStream } from '../sse'
import type { Generate } from './generator'

export function generationStream(
	request: Request,
	generate: Generate,
	release: () => void
): Response {
	const events = createEventStream(request)
	const phases: ProgressPhase[] = []

	function emit(event: GenerationEvent) {
		events.emit(event.type, event.data)
	}

	function finishPhase(status: 'completed' | 'failed') {
		const current = phases.at(-1)
		if (current?.status === 'running') {
			current.status = status
			current.finished_at = Date.now()
		}
	}

	function progress(event: GenerationProgress) {
		if (events.signal.aborted) return
		const current = phases.at(-1)
		if (current?.phase === event.phase) {
			current.message = event.message
		} else {
			finishPhase('completed')
			phases.push({
				phase: event.phase,
				status: 'running',
				started_at: Date.now(),
				finished_at: null,
				message: event.message
			})
		}
		emit({ type: 'phase', data: phases })
	}

	async function run() {
		try {
			const result = await generate(progress)
			if (
				Buffer.byteLength(JSON.stringify(result), 'utf8') > DEFAULT_GENERATION_LIMITS.maxOutputBytes
			) {
				throw new Error('Generated result is too large.')
			}
			finishPhase('completed')
			emit({ type: 'phase', data: phases })
			emit({ type: 'done', data: { state: 'completed', result } })
		} catch {
			// Provider exceptions may contain request details. Never send or log their raw text.
			console.error('AI generation failed.')
			finishPhase('failed')
			emit({ type: 'phase', data: phases })
			emit({ type: 'error', data: { message: 'Generation failed. Please try again.' } })
			emit({ type: 'done', data: { state: 'failed' } })
		} finally {
			// The core promise settles only after provider-file cleanup, even without a reader.
			release()
			events.close()
		}
	}

	emit({ type: 'state', data: { state: 'running' } })
	progress({ phase: 'preparation', message: 'Preparing generation' })
	// Accepted work runs even if the observer has already disconnected.
	void run()
	return events.response
}
