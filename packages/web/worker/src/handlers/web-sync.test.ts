import { describe, test, expect, vi, beforeEach } from 'vitest'
import { WebSync } from './web-sync.js'
import { runWebSync } from '../lib/web-sync.js'
import type { HandlerContext } from './context.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('../lib/web-sync.js')

const mocks = {
	runWebSync: vi.mocked(runWebSync),
}

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

describe('handlers/web-sync', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.runWebSync.mockResolvedValue(undefined)
	})

	test('calls runWebSync and returns ok', async () => {
		const ctx = makeContext()
		const handler = new WebSync()

		const result = await handler.run(ctx)

		expect(mocks.runWebSync).toHaveBeenCalledWith(ctx.db, ctx.config, ctx.logger)
		expect(result).toBe('ok')
	})

	test('throws when module throws', async () => {
		const ctx = makeContext()
		mocks.runWebSync.mockRejectedValueOnce(new Error('web sync failed'))

		const handler = new WebSync()

		await expect(handler.run(ctx)).rejects.toThrow('web sync failed')
	})
})
