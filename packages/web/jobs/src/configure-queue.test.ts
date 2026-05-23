import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Sidequest } from 'sidequest'
import { configureProducerQueue, configureConsumerQueue } from './configure-queue.js'

vi.mock('sidequest', () => ({
	Sidequest: {
		configure: vi.fn()
	}
}))

describe('configureProducerQueue', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('enables manualJobResolution but omits jobsFilePath', async () => {
		await configureProducerQueue({ dbPath: '/tmp/queue.sqlite' })

		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		expect(call?.manualJobResolution).toBe(true)
		expect(call?.jobsFilePath).toBeUndefined()
		expect(call?.maxConcurrentJobs).toBe(1)
		expect(call?.backend).toEqual({
			driver: '@sidequest/sqlite-backend',
			config: '/tmp/queue.sqlite'
		})
	})
})

describe('configureConsumerQueue', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('enables manual resolution and forwards the caller-supplied jobsFilePath', async () => {
		await configureConsumerQueue({
			dbPath: '/app/queue.sqlite',
			jobsFilePath: '/srv/worker/sidequest.jobs.js'
		})

		const call = vi.mocked(Sidequest.configure).mock.calls[0]?.[0]
		expect(call?.manualJobResolution).toBe(true)
		expect(call?.jobsFilePath).toBe('/srv/worker/sidequest.jobs.js')
		expect(call?.maxConcurrentJobs).toBe(1)
		expect(call?.backend).toEqual({
			driver: '@sidequest/sqlite-backend',
			config: '/app/queue.sqlite'
		})
	})
})
