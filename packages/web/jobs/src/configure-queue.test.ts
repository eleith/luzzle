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

	test('falls back to a self-referencing jobsFilePath when caller omits it', async () => {
		await configureQueue({ dbPath: '/tmp/queue.sqlite' })

		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		expect(call?.manualJobResolution).toBe(true)
		expect(call?.jobsFilePath).toMatch(/configure-queue\.(ts|js)$/)
		expect(call?.maxConcurrentJobs).toBe(1)
		expect(call?.backend).toEqual({
			driver: '@sidequest/sqlite-backend',
			config: '/tmp/queue.sqlite'
		})
	})

	test('forwards a caller-supplied jobsFilePath', async () => {
		await configureQueue({
			dbPath: '/app/queue.sqlite',
			jobsFilePath: '/srv/worker/sidequest.jobs.js'
		})

		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		expect(call?.manualJobResolution).toBe(true)
		expect(call?.jobsFilePath).toBe('/srv/worker/sidequest.jobs.js')
		expect(call?.backend?.config).toBe('/app/queue.sqlite')
	})
})
