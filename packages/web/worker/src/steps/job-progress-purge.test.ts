import { describe, test, expect, vi } from 'vitest'
import { jobProgressPurgeStep } from './job-progress-purge.js'
import { JobProgress } from '../core/job-progress.js'
import type { WorkerContext } from '../services/context.js'
import { promises as fs } from 'node:fs'

const mockPurgeOld = vi.fn().mockResolvedValue([])

vi.mock('../core/job-progress.js', () => ({
	JobProgress: vi.fn().mockImplementation(() => ({
		purgeOld: mockPurgeOld,
	})),
}))

function makeCtx(): WorkerContext {
	return {
		config: { paths: { assets: '/assets/pieces' } } as unknown as WorkerContext['config'],
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
		mockPurgeOld.mockResolvedValueOnce([])
		const result = await jobProgressPurgeStep.run({}, makeCtx())
		expect(result.status).toBe('completed')
		expect(JobProgress).toHaveBeenCalledWith(expect.anything(), 2)
	})

	test('honors explicit retentionDays', async () => {
		mockPurgeOld.mockResolvedValueOnce([])
		await jobProgressPurgeStep.run({ retentionDays: 7 }, makeCtx())
		expect(JobProgress).toHaveBeenCalledWith(expect.anything(), 7)
	})

	test('deletes cached preview folders for purged job IDs', async () => {
		mockPurgeOld.mockResolvedValueOnce([101, 102])
		const rmSpy = vi.spyOn(fs, 'rm').mockResolvedValue(undefined)

		await jobProgressPurgeStep.run({}, makeCtx())

		expect(rmSpy).toHaveBeenCalledTimes(2)
		expect(rmSpy).toHaveBeenNthCalledWith(1, '/assets/previews/101', { recursive: true, force: true })
		expect(rmSpy).toHaveBeenNthCalledWith(2, '/assets/previews/102', { recursive: true, force: true })

		rmSpy.mockRestore()
	})
})
