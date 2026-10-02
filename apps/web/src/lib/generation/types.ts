import type { ProgressPhase } from '$lib/components/progress'

export type GenerationTarget = { kind: 'field'; key: string } | { kind: 'body' }

export type GenerationResult =
	| { kind: 'creation'; markdown: string }
	| { kind: 'field'; key: string; value: unknown }
	| { kind: 'body'; value: string }

export type GenerationEvent =
	| { type: 'state'; data: { state: 'running' } }
	| { type: 'phase'; data: ProgressPhase[] }
	| { type: 'error'; data: { message: string } }
	| {
			type: 'done'
			data: { state: 'completed'; result: GenerationResult } | { state: 'failed' }
	  }
