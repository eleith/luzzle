import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { runProgressPhase, type DurableStepApi } from './run-progress-phase.js'
import { PhaseLogger } from './phase-logger.js'
import { completed, skipped, type Step, type StepContext } from './step.js'
import type { JobProgress } from './job-progress.js'
import { RcloneClient } from '../services/rclone.js'
import type { WorkerContext } from '../services/context.js'
import type { AppDatabase } from '../services/db.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'

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

describe('runProgressPhase', () => {
	test('completes: marks start + complete and returns the value', async () => {
		const progress = makeProgress()
		const jobStep = makeJobStep('build', vi.fn().mockResolvedValue(completed({ ok: 1 })))

		const result = await runProgressPhase(
			makeStep(),
			makeCtx({}),
			'job1',
			progress,
			jobStep,
			undefined
		)

		expect(result).toEqual({ ok: 1 })
		expect(progress.start).toHaveBeenCalledWith('job1', 'build')
		expect(progress.complete).toHaveBeenCalledWith('job1', 'build')
		expect(progress.skip).not.toHaveBeenCalled()
	})

	test('skips: marks skip with its message and returns undefined', async () => {
		const progress = makeProgress()
		const jobStep = makeJobStep('build', vi.fn().mockResolvedValue(skipped('nope')))

		const result = await runProgressPhase(
			makeStep(),
			makeCtx({}),
			'job1',
			progress,
			jobStep,
			undefined
		)

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

	describe('scoped logging', () => {
		let ctx: WorkerContext

		beforeEach(async () => {
			const db = (await setupDatabase()).withTables<AppDatabase>()
			const base = {
				debug: vi.fn(),
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				stdout: vi.fn(),
				stderr: vi.fn(),
			}
			const logger = new PhaseLogger(base, db)
			ctx = { db, logger, rclone: new RcloneClient(logger), config: {} as WorkerContext['config'] }
		})

		afterEach(async () => {
			await teardownDatabase(ctx.db)
		})

		test.each(['completed', 'skipped', 'failed'])(
			'keeps an overlapping phase isolated when another phase is %s',
			async (outcome) => {
				let release!: () => void
				let entered!: () => void
				const hold = new Promise<void>((resolve) => {
					release = resolve
				})
				const started = new Promise<void>((resolve) => {
					entered = resolve
				})
				const firstStep = makeJobStep('build', async (_, phaseCtx) => {
					expect(phaseCtx).not.toBe(ctx)
					expect(phaseCtx.rclone).not.toBe(ctx.rclone)
					phaseCtx.logger.info('first start')
					entered()
					await hold
					phaseCtx.logger.info('first end')
					return completed(1)
				})
				const first = runProgressPhase(
					makeStep(),
					ctx,
					'job1',
					makeProgress(),
					firstStep,
					undefined
				)
				try {
					await Promise.race([
						started,
						first.then(() => {
							throw new Error('First phase completed before overlap')
						}),
					])
					const otherStep = makeJobStep('build', async (_, phaseCtx) => {
						phaseCtx.logger.info('other log')
						if (outcome === 'failed') throw new Error('other failed')
						return outcome === 'skipped' ? skipped('no work') : completed(2)
					})
					const other = runProgressPhase(
						makeStep(),
						ctx,
						'job2',
						makeProgress(),
						otherStep,
						undefined
					)
					if (outcome === 'failed') {
						await expect(other).rejects.toThrow('other failed')
					} else {
						expect(await other).toBe(outcome === 'skipped' ? undefined : 2)
					}
					ctx.logger.info('unscoped')
				} finally {
					release()
					await first
				}

				const logs = () =>
					ctx.db
						.selectFrom('job_progress_logs')
						.selectAll()
						.orderBy('job_id')
						.orderBy('line_number')
						.execute()
				await expect.poll(logs).toHaveLength(3)
				expect(await logs()).toMatchObject([
					{ job_id: 'job1', phase: 'build', line_number: 1, message: 'first start' },
					{ job_id: 'job1', phase: 'build', line_number: 2, message: 'first end' },
					{ job_id: 'job2', phase: 'build', line_number: 1, message: 'other log' },
				])
			}
		)
	})
})
