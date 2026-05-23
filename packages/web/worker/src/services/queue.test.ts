import { describe, expect, test, vi, beforeEach } from 'vitest'
import { fileURLToPath } from 'node:url'

const EXPECTED_JOBS_PATH = fileURLToPath(new URL('../sidequest.jobs.js', import.meta.url))

describe('configureQueue', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	test('delegates to the shared configureQueue with the resolved jobs file path', async () => {
		const configureSharedQueue = vi.fn().mockResolvedValue(undefined)
		vi.doMock('@luzzle/web.jobs', () => ({ configureQueue: configureSharedQueue }))

		const { configureQueue } = await import('./queue.js')

		await configureQueue('/app/queue/sidequest.db')

		expect(configureSharedQueue).toHaveBeenCalledOnce()
		expect(configureSharedQueue).toHaveBeenCalledWith({
			dbPath: '/app/queue/sidequest.db',
			jobsFilePath: EXPECTED_JOBS_PATH
		})
	})

	test('propagates configure errors', async () => {
		const configureSharedQueue = vi.fn().mockRejectedValue(new Error('boom'))
		vi.doMock('@luzzle/web.jobs', () => ({ configureQueue: configureSharedQueue }))

		const { configureQueue } = await import('./queue.js')

		await expect(configureQueue('/tmp/x.db')).rejects.toThrow('boom')
	})
})

describe('resolveJobsFilePath', () => {
	test('points at sidequest.jobs.js next to the running module', async () => {
		const { resolveJobsFilePath } = await import('./queue.js')
		expect(resolveJobsFilePath()).toBe(EXPECTED_JOBS_PATH)
	})
})
