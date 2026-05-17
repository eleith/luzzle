import type { WorkerContext } from '../services/context.js'

export type StepContext = WorkerContext

export type StepResult<T> =
	| { status: 'completed'; value: T; message?: string }
	| { status: 'skipped'; message?: string }

export interface Step<I, O> {
	readonly name: string
	run(input: I, ctx: StepContext): Promise<StepResult<O>>
}

export function completed<T>(value: T, message?: string): StepResult<T> {
	return { status: 'completed', value, message }
}

export function skipped(message?: string): StepResult<never> {
	return { status: 'skipped', message }
}
