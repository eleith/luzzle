import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Sidequest } from 'sidequest'
import { configureQueue } from './configure-queue.js'

vi.mock('sidequest', () => ({
	Sidequest: {
		configure: vi.fn()
	}
}))

describe('configureQueue', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('configures Sidequest with sqlite backend, manual resolution, and maxConcurrentJobs=1', async () => {
		await configureQueue({
			dbPath: '/tmp/queue.sqlite',
			jobsFilePath: '/srv/jobs.js'
		})

		expect(Sidequest.configure).toHaveBeenCalledWith({
			backend: {
				driver: '@sidequest/sqlite-backend',
				config: '/tmp/queue.sqlite'
			},
			manualJobResolution: true,
			jobsFilePath: '/srv/jobs.js',
			maxConcurrentJobs: 1
		})
	})

	test('passes through caller-provided paths verbatim', async () => {
		await configureQueue({ dbPath: 'a.db', jobsFilePath: 'b.js' })
		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		expect(call?.backend?.config).toBe('a.db')
		expect(call?.jobsFilePath).toBe('b.js')
	})
})
