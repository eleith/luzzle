import { describe, test, expect, vi, beforeEach } from 'vitest'
import { JobProgressPurge } from './job-progress-purge.js'
import { jobProgressPurgeStep } from '../steps/job-progress-purge.js'
import { setWorkerContext, type WorkerContext } from '../services/context.js'
import { completed } from '../core/step.js'
import type { Logger } from '../services/logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('../steps/job-progress-purge.js', () => ({
	jobProgressPurgeStep: { name: 'job_progress.purge', run: vi.fn() },
}))

function makeContext(): WorkerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		stdout: vi.fn(),
		stderr: vi.fn(),
	}
	return {
		config: {} as Config,
		logger,
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

describe('jobs/job-progress-purge', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(jobProgressPurgeStep.run).mockResolvedValue(completed(undefined))
	})

	test('returns ok and delegates to step', async () => {
		const ctx = makeContext()
		setWorkerContext(ctx)
		const result = await new JobProgressPurge().run({ retentionDays: 7 })
		expect(result).toBe('ok')
		expect(jobProgressPurgeStep.run).toHaveBeenCalledWith({ retentionDays: 7 }, ctx)
	})

	test('defaults payload to empty object', async () => {
		setWorkerContext(makeContext())
		await new JobProgressPurge().run()
		expect(jobProgressPurgeStep.run).toHaveBeenCalledWith({}, expect.anything())
	})

	test('logs and rethrows on step failure', async () => {
		vi.mocked(jobProgressPurgeStep.run).mockRejectedValueOnce(new Error('boom'))
		const ctx = makeContext()
		setWorkerContext(ctx)
		await expect(new JobProgressPurge().run()).rejects.toThrow('boom')
		expect(ctx.logger.error).toHaveBeenCalledWith(
			'job_progress purge failed',
			expect.objectContaining({ error: 'boom' })
		)
	})
})
