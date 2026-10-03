import {
	DEFAULT_GENERATION_LIMITS,
	GenerationValidationError,
	type GenerationProgress
} from '@luzzle/core'
import type { ProgressPhase } from '$lib/components/progress'
import type { GenerationEvent, GenerationResult } from '$lib/generation/types'
import { createEventStream } from '../sse'

export function createGenerationStream(request: Request) {
	const events = createEventStream(request)
	const phases: ProgressPhase[] = []
	let currentPhase: GenerationProgress['phase'] = 'preparation'

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
		currentPhase = event.phase
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

	async function sendResult(work: Promise<GenerationResult>, release: () => void) {
		try {
			const result = await work
			const bytes = Buffer.byteLength(JSON.stringify(result), 'utf8')
			if (bytes > DEFAULT_GENERATION_LIMITS.maxOutputBytes) {
				throw new Error('Generated result is too large.')
			}
			finishPhase('completed')
			emit({ type: 'phase', data: phases })
			emit({ type: 'done', data: { state: 'completed', result } })
		} catch (cause) {
			const validation = cause instanceof GenerationValidationError ? cause.message : undefined
			const error = cause instanceof Error ? cause : undefined
			const header = error ? `${error.name}: ${error.message}` : ''
			const stack = error?.stack
			const providerCause = error?.cause ?? cause
			let status: number | undefined
			if (
				providerCause &&
				typeof providerCause === 'object' &&
				'status' in providerCause &&
				typeof providerCause.status === 'number'
			) {
				status = providerCause.status
			}
			const callSite = stack?.startsWith(header)
				? stack.slice(header.length).trimStart()
				: undefined
			// Keep the call site and HTTP status, not a provider message that may echo inputs.
			console.error('AI generation failed.', {
				phase: currentPhase,
				validation,
				error: error?.name ?? 'Unknown error',
				status,
				stack: callSite
			})
			finishPhase('failed')
			emit({ type: 'phase', data: phases })
			emit({
				type: 'error',
				data: { message: validation ?? 'Generation failed. Please try again.' }
			})
			emit({ type: 'done', data: { state: 'failed' } })
		} finally {
			// The core promise settles only after provider-file cleanup, even without a reader.
			release()
			events.close()
		}
	}

	emit({ type: 'state', data: { state: 'running' } })
	progress({ phase: 'preparation', message: 'Preparing generation' })
	// The request signal only detaches the observer; it never cancels accepted work.
	return { response: events.response, progress, sendResult }
}
