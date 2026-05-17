import { describe, expect, test, vi, beforeEach } from 'vitest'
import { resolveQueueDbPath } from './queue.js'
import { Sidequest } from 'sidequest'
import { config } from '$lib/server/config.js'
import path from 'node:path'

vi.mock('sidequest', () => ({
	Sidequest: { configure: vi.fn().mockResolvedValue(undefined) }
}))

vi.mock('$lib/server/config.js', () => ({
	config: {
		worker: {}
	}
}))

describe('queue', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
	})

	test('resolveQueueDbPath defaults to ./data/sidequest.sqlite', () => {
		config.worker = {}
		expect(resolveQueueDbPath()).toBe(path.resolve(process.cwd(), './data/sidequest.sqlite'))
	})

	test('resolveQueueDbPath uses config', () => {
		config.worker = { queue: { path: '/tmp/test.db' } }
		expect(resolveQueueDbPath()).toBe(path.resolve(process.cwd(), '/tmp/test.db'))
	})

	test('configureQueue calls Sidequest.configure with correct backend', async () => {
		config.worker = { queue: { path: '/custom/path.db' } }
		const { configureQueue, resolveJobsFilePath } = await import('./queue.js')

		await configureQueue()

		expect(Sidequest.configure).toHaveBeenCalledWith({
			backend: {
				driver: '@sidequest/sqlite-backend',
				config: path.resolve(process.cwd(), '/custom/path.db')
			},
			manualJobResolution: true,
			jobsFilePath: resolveJobsFilePath()
		})
	})
})
