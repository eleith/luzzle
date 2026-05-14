import { describe, expect, test, vi, beforeEach } from 'vitest'

describe('configureQueue', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	test('calls Sidequest.configure with the sqlite backend and maxConcurrentJobs=1', async () => {
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
