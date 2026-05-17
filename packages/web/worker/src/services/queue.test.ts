import { describe, expect, test, vi, beforeEach } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const EXPECTED_JOBS_PATH = path.join(SRC_DIR, 'sidequest.jobs.js')

describe('configureQueue', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	test('calls Sidequest.configure with manual resolution and the resolved jobs file path', async () => {
		const configure = vi.fn().mockResolvedValue(undefined)
		vi.doMock('sidequest', () => ({ Sidequest: { configure } }))

		const { configureQueue } = await import('./queue.js')

		await configureQueue('/app/queue/sidequest.db')

		expect(configure).toHaveBeenCalledOnce()
		expect(configure).toHaveBeenCalledWith({
			backend: {
				driver: '@sidequest/sqlite-backend',
				config: '/app/queue/sidequest.db'
			},
			manualJobResolution: true,
			jobsFilePath: EXPECTED_JOBS_PATH,
			maxConcurrentJobs: 1
		})
	})

	test('propagates configure errors', async () => {
		const configure = vi.fn().mockRejectedValue(new Error('boom'))
		vi.doMock('sidequest', () => ({ Sidequest: { configure } }))

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
