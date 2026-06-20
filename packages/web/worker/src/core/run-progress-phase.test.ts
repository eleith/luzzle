import { describe, test, expect, vi } from 'vitest'
import { runProgressPhase, type DurableStepApi } from './run-progress-phase.js'
import { PhaseLogger } from './phase-logger.js'
import { completed, skipped, type Step, type StepContext } from './step.js'
import type { JobProgress } from './job-progress.js'

function makeStep(): DurableStepApi {
	return {
		run: vi.fn(async (_config: { name: string }, fn: () => Promise<unknown>) => fn()),
	} as unknown as DurableStepApi
}

function makeProgress() {
	return {
		start: vi.fn().mockResolvedValue(undefined),
		complete: vi.fn().mockResolvedValue(undefined),
		skip: vi.fn().mockResolvedValue(undefined),
		fail: vi.fn().mockResolvedValue(undefined),
	} as unknown as JobProgress
}

function makeCtx(logger: unknown): StepContext {
	return { logger } as unknown as StepContext
}

function makeJobStep<O>(name: string, run: Step<void, O>['run']): Step<void, O> {
	return { name, run }
}

function makePhaseLogger(): PhaseLogger {
	const base = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		stdout: vi.fn(),
		stderr: vi.fn(),
	}
	return new PhaseLogger(base, {} as never)
}

describe('runProgressPhase', () => {
	test('completes: marks start + complete and returns the value', async () => {
		const progress = makeProgress()
		const jobStep = makeJobStep('build', vi.fn().mockResolvedValue(completed({ ok: 1 })))

		const result = await runProgressPhase(makeStep(), makeCtx({}), 'job1', progress, jobStep, undefined)

		expect(result).toEqual({ ok: 1 })
		expect(progress.start).toHaveBeenCalledWith('job1', 'build')
		expect(progress.complete).toHaveBeenCalledWith('job1', 'build')
		expect(progress.skip).not.toHaveBeenCalled()
	})

	test('skips: marks skip with its message and returns undefined', async () => {
		const progress = makeProgress()
		const jobStep = makeJobStep('build', vi.fn().mockResolvedValue(skipped('nope')))

		const result = await runProgressPhase(makeStep(), makeCtx({}), 'job1', progress, jobStep, undefined)

		expect(result).toBeUndefined()
		expect(progress.skip).toHaveBeenCalledWith('job1', 'build', 'nope')
		expect(progress.complete).not.toHaveBeenCalled()
	})

	test('skips: falls back to a default message', async () => {
		const progress = makeProgress()
		const jobStep = makeJobStep('build', vi.fn().mockResolvedValue({ status: 'skipped' }))

		await runProgressPhase(makeStep(), makeCtx({}), 'job1', progress, jobStep, undefined)

		expect(progress.skip).toHaveBeenCalledWith('job1', 'build', 'skipped')
	})

	test('fails: marks fail and rethrows', async () => {
		const progress = makeProgress()
		const err = new Error('boom')
		const jobStep = makeJobStep('build', vi.fn().mockRejectedValue(err))

		await expect(
			runProgressPhase(makeStep(), makeCtx({}), 'job1', progress, jobStep, undefined)
		).rejects.toThrow('boom')
		expect(progress.fail).toHaveBeenCalledWith('job1', 'build', err)
	})

	test('sets and clears the active phase for a PhaseLogger', async () => {
		const progress = makeProgress()
		const phaseLogger = makePhaseLogger()
		const setSpy = vi.spyOn(phaseLogger, 'setActivePhase')
		const clearSpy = vi.spyOn(phaseLogger, 'clearActivePhase')
		const jobStep = makeJobStep('build', vi.fn().mockResolvedValue(completed(1)))

		await runProgressPhase(makeStep(), makeCtx(phaseLogger), 'job1', progress, jobStep, undefined)

		expect(setSpy).toHaveBeenCalledWith({ jobId: 'job1', phase: 'build' })
		expect(clearSpy).toHaveBeenCalled()
	})

	test('clears the active phase even when the step throws', async () => {
		const progress = makeProgress()
		const phaseLogger = makePhaseLogger()
		const clearSpy = vi.spyOn(phaseLogger, 'clearActivePhase')
		const jobStep = makeJobStep('build', vi.fn().mockRejectedValue(new Error('x')))

		await expect(
			runProgressPhase(makeStep(), makeCtx(phaseLogger), 'job1', progress, jobStep, undefined)
		).rejects.toThrow('x')
		expect(clearSpy).toHaveBeenCalled()
	})
})
