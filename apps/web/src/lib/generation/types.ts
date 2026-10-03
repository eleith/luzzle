import type { ProgressPhase } from '$lib/components/progress'

export type GenerationResult = { markdown: string }

export type GenerationEvent =
	| { type: 'state'; data: { state: 'running' } }
	| { type: 'phase'; data: ProgressPhase[] }
	| { type: 'error'; data: { message: string } }
	| {
			type: 'done'
			data: { state: 'completed'; result: GenerationResult } | { state: 'failed' }
	  }
