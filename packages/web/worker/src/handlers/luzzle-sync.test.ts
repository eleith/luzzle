import { describe, test, expect, vi, beforeEach } from 'vitest'
import { LuzzleSync } from './luzzle-sync.js'
import { runLuzzleSync } from '../lib/luzzle-sync.js'
import { setWorkerContext, type WorkerContext } from './context.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('../lib/luzzle-sync.js')

const mocks = {
	runLuzzleSync: vi.mocked(runLuzzleSync),
}

function makeContext(): WorkerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}

	return {
		config: { storage: { root: '/app/archive' } } as Config,
		logger,
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

describe('handlers/luzzle-sync', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.runLuzzleSync.mockResolvedValue(undefined)
	})

	test('calls runLuzzleSync and returns ok', async () => {
		const ctx = makeContext()
		setWorkerContext(ctx)
		const handler = new LuzzleSync()

		const result = await handler.run()

		expect(mocks.runLuzzleSync).toHaveBeenCalledWith(ctx.config, ctx.logger)
		expect(result).toBe('ok')
	})

	test('throws when module throws', async () => {
		const ctx = makeContext()
		setWorkerContext(ctx)
		mocks.runLuzzleSync.mockRejectedValueOnce(new Error('sync failed'))

		const handler = new LuzzleSync()

		await expect(handler.run()).rejects.toThrow('sync failed')
	})
})
