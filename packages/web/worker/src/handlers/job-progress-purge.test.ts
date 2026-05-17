import { describe, test, expect, vi, beforeEach } from 'vitest'
import { JobProgressPurge } from './job-progress-purge.js'
import { JobProgress } from '../lib/job-progress.js'
import { setWorkerContext, type WorkerContext } from './context.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('../lib/job-progress.js', () => ({
	JobProgress: vi.fn().mockImplementation(() => ({
		purgeOld: vi.fn().mockResolvedValue(undefined),
	})),
}))

const mockedJobProgress = vi.mocked(JobProgress)

function makeContext(): WorkerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
	return {
		config: {} as Config,
		logger,
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

describe('handlers/JobProgressPurge', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('purges with default retention of 2 days', async () => {
		const ctx = makeContext()
		setWorkerContext(ctx)

		const result = await new JobProgressPurge().run()

		expect(result).toBe('ok')
		expect(mockedJobProgress).toHaveBeenCalledWith(ctx.db, 2)
		const instance = mockedJobProgress.mock.results[0].value
		expect(instance.purgeOld).toHaveBeenCalledOnce()
		expect(ctx.logger.info).toHaveBeenCalledWith(
			'job_progress purge complete',
			{ retentionDays: 2 }
		)
	})

	test('honours retentionDays from payload', async () => {
		const ctx = makeContext()
		setWorkerContext(ctx)

		await new JobProgressPurge().run({ retentionDays: 7 })

		expect(mockedJobProgress).toHaveBeenCalledWith(ctx.db, 7)
	})

	test('logs and rethrows when purgeOld fails', async () => {
		mockedJobProgress.mockImplementationOnce(
			() =>
				({
					purgeOld: vi.fn().mockRejectedValue(new Error('db down')),
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				}) as any
		)
		const ctx = makeContext()
		setWorkerContext(ctx)

		await expect(new JobProgressPurge().run()).rejects.toThrow('db down')
		expect(ctx.logger.error).toHaveBeenCalledWith(
			'job_progress purge failed',
			{ error: 'db down' }
		)
	})
})
