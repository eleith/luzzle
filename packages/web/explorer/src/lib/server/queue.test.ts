import { describe, expect, test, vi, beforeEach } from 'vitest'
import { resolveQueueDbPath } from './queue.js'
import { Sidequest } from 'sidequest'
import { config } from '$lib/server/config.js'
import path from 'node:path'
import { Job } from '@sidequest/core'

vi.mock('sidequest', () => {
	const configure = vi.fn().mockResolvedValue(undefined)
	const enqueue = vi.fn().mockResolvedValue({ id: 'job-123' })
	const maxAttempts = vi.fn().mockReturnValue({ enqueue })
	const build = vi.fn().mockReturnValue({ maxAttempts })
	return { Sidequest: { configure, build, enqueue } }
})

vi.mock('$lib/server/config.js', () => ({
	config: {
		worker: {}
	}
}))

describe('queue', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// reset configured state by overriding
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
		// we need to dynamically import to reset configured state
		const { configureQueue } = await import('./queue.js')

		await configureQueue()

		expect(Sidequest.configure).toHaveBeenCalledWith({
			backend: {
				driver: '@sidequest/sqlite-backend',
				config: path.resolve(process.cwd(), '/custom/path.db')
			},
			manualJobResolution: true
		})
	})

	test('enqueueJob enqueues a job and configures the queue', async () => {
		const { enqueueJob } = await import('./queue.js')

		class DummyJob extends Job {
			run() {
				return Promise.resolve()
			}
		}

		const result = await enqueueJob(DummyJob, { foo: 'bar' })

		expect(Sidequest.build).toHaveBeenCalledWith(DummyJob)
		expect(Sidequest.build(DummyJob).maxAttempts).toHaveBeenCalledWith(1)
		expect(Sidequest.build(DummyJob).maxAttempts(1).enqueue).toHaveBeenCalledWith({ foo: 'bar' })
		expect(result).toEqual({ id: 'job-123' })
	})
})
