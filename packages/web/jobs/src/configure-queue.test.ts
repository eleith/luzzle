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

	test('defaults jobsFilePath to this package’s producer stubs bundle', async () => {
		await configureQueue({ dbPath: '/tmp/queue.sqlite' })

		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		expect(call?.jobsFilePath).toMatch(/stubs[/\\]index\.js$/)
		expect(call?.manualJobResolution).toBe(true)
		expect(call?.maxConcurrentJobs).toBe(1)
		expect(call?.backend).toEqual({
			driver: '@sidequest/sqlite-backend',
			config: '/tmp/queue.sqlite'
		})
	})

	test('caller-provided jobsFilePath overrides the default (consumer mode)', async () => {
		await configureQueue({
			dbPath: 'a.db',
			jobsFilePath: '/srv/worker/sidequest.jobs.js'
		})
		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		expect(call?.jobsFilePath).toBe('/srv/worker/sidequest.jobs.js')
		expect(call?.backend?.config).toBe('a.db')
	})
})
