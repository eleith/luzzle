import { describe, expect, test, vi, beforeEach } from 'vitest'
import { configureQueue, resolveQueueDbPath } from './queue.js'
import { configureProducerQueue } from '@luzzle/web.jobs'
import { config } from '$lib/server/config.js'
import path from 'node:path'

vi.mock('@luzzle/web.jobs', () => ({
	configureProducerQueue: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('$lib/server/config.js', () => ({
	config: {
		worker: {}
	}
}))

describe('queue', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('resolveQueueDbPath defaults to ./data/sidequest.sqlite', () => {
		config.worker = {}
		expect(resolveQueueDbPath()).toBe(path.resolve(process.cwd(), './data/sidequest.sqlite'))
	})

	test('resolveQueueDbPath uses config', () => {
		config.worker = { queue: { path: '/tmp/test.db' } }
		expect(resolveQueueDbPath()).toBe(path.resolve(process.cwd(), '/tmp/test.db'))
	})

	test('configureQueue delegates to configureProducerQueue with the resolved dbPath', async () => {
		config.worker = { queue: { path: '/custom/path.db' } }

		await configureQueue()

		expect(configureProducerQueue).toHaveBeenCalledWith({
			dbPath: path.resolve(process.cwd(), '/custom/path.db')
		})
	})
})
