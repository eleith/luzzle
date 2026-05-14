import { describe, test, expect, vi, beforeEach } from 'vitest'
import { LuzzleSync } from './luzzle-sync.js'
import type { HandlerContext } from './context.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('../lib/luzzle-sync.js', () => ({
	runLuzzleSync: vi.fn().mockResolvedValue(undefined)
}))

const mockRunLuzzleSync = vi.mocked(
	(await import('../lib/luzzle-sync.js')).runLuzzleSync
)

function makeContext(): HandlerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}

	return {
		config: { storage: { root: '/app/archive' } } as Config,
		logger,
		rclone: {} as HandlerContext['rclone'],
		db: {} as HandlerContext['db'],
	}
}

describe('handlers/luzzle-sync', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('calls runLuzzleSync and returns ok', async () => {
		const ctx = makeContext()
		const handler = new LuzzleSync()

		const result = await handler.run(ctx)

		expect(mockRunLuzzleSync).toHaveBeenCalledWith(ctx.config, ctx.logger)
		expect(result).toBe('ok')
	})

	test('throws when module throws', async () => {
		const ctx = makeContext()
		mockRunLuzzleSync.mockRejectedValueOnce(new Error('sync failed'))

		const handler = new LuzzleSync()

		await expect(handler.run(ctx)).rejects.toThrow('sync failed')
	})
})
