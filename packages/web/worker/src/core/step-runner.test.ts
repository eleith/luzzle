import { describe, it, expect, vi } from 'vitest'
import { StepRunner } from './step-runner.js'
import { completed, skipped, type Step } from './step.js'
import type { JobProgress } from './job-progress.js'
import type { WorkerContext } from '../services/context.js'
import type { PhaseLogger } from './phase-logger.js'

function makeProgress(): JobProgress {
	return {
		start: vi.fn().mockResolvedValue(undefined),
		complete: vi.fn().mockResolvedValue(undefined),
		skip: vi.fn().mockResolvedValue(undefined),
		fail: vi.fn().mockResolvedValue(undefined),
		purgeOld: vi.fn().mockResolvedValue(undefined),
	} as unknown as JobProgress
}

function makeCtx(): WorkerContext {
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		stdout: vi.fn(),
		stderr: vi.fn(),
		setActivePhase: vi.fn(),
		clearActivePhase: vi.fn(),
	} as unknown as PhaseLogger
	return {
		config: {} as WorkerContext['config'],
		logger,
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

describe('StepRunner', () => {
	it('runs a Step and reports completed with value + message', async () => {
		const step: Step<{ x: number }, number> = {
			name: 'test.step',
			run: vi.fn().mockResolvedValue(completed(42, 'done')),
		}
		const progress = makeProgress()
		const ctx = makeCtx()
		const runner = new StepRunner(ctx, progress, '7')

		const value = await runner.run(step, { x: 1 })

		expect(value).toBe(42)
		expect(progress.start).toHaveBeenCalledWith('7', 'test.step')
		expect(progress.complete).toHaveBeenCalledWith('7', 'test.step', 'done')
		expect((ctx.logger as PhaseLogger).setActivePhase).toHaveBeenCalledWith({
			jobId: '7',
			phase: 'test.step',
		})
		expect((ctx.logger as PhaseLogger).clearActivePhase).toHaveBeenCalled()
	})

	it('reports skipped with reason and returns undefined', async () => {
		const step: Step<void, string> = {
			name: 'cdn.sync',
			run: vi.fn().mockResolvedValue(skipped('no remote configured')),
		}
		const progress = makeProgress()
		const runner = new StepRunner(makeCtx(), progress, '9')

		const value = await runner.run(step, undefined)

		expect(value).toBeUndefined()
		expect(progress.skip).toHaveBeenCalledWith('9', 'cdn.sync', 'no remote configured')
		expect(progress.complete).not.toHaveBeenCalled()
	})

	it('reports fail on Step throw and re-throws', async () => {
		const step: Step<void, void> = {
			name: 'broken.step',
			run: vi.fn().mockRejectedValue(new Error('boom')),
		}
		const progress = makeProgress()
		const ctx = makeCtx()
		const runner = new StepRunner(ctx, progress, '11')

		await expect(runner.run(step, undefined)).rejects.toThrow('boom')
		expect(progress.fail).toHaveBeenCalledWith('11', 'broken.step', expect.any(Error))
		expect((ctx.logger as PhaseLogger).clearActivePhase).toHaveBeenCalled()
	})
})
