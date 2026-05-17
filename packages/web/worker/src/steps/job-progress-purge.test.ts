import { describe, test, expect, vi } from 'vitest'
import { jobProgressPurgeStep } from './job-progress-purge.js'
import { JobProgress } from '../core/job-progress.js'
import type { WorkerContext } from '../services/context.js'

vi.mock('../core/job-progress.js', () => ({
	JobProgress: vi.fn().mockImplementation(() => ({
		purgeOld: vi.fn().mockResolvedValue(undefined),
	})),
}))

function makeCtx(): WorkerContext {
	return {
		config: {} as WorkerContext['config'],
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		},
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

describe('jobProgressPurgeStep', () => {
	test('uses default retentionDays=2', async () => {
		const result = await jobProgressPurgeStep.run({}, makeCtx())
		expect(result.status).toBe('completed')
		expect(JobProgress).toHaveBeenCalledWith(expect.anything(), 2)
	})

	test('honors explicit retentionDays', async () => {
		await jobProgressPurgeStep.run({ retentionDays: 7 }, makeCtx())
		expect(JobProgress).toHaveBeenCalledWith(expect.anything(), 7)
	})
})
