import { describe, test, expect, vi, beforeEach } from 'vitest'
import { CdnSync } from './cdn-sync.js'
import type { HandlerContext } from './context.js'
import type { RcloneClient } from '../lib/rclone.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

function makeContext(overrides?: Partial<HandlerContext>): HandlerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}

	const rclone: RcloneClient = {
		bisync: vi.fn().mockResolvedValue(undefined),
		copy: vi.fn().mockResolvedValue(undefined),
	} as unknown as RcloneClient

	return {
		config: {} as Config,
		logger,
		rclone,
		db: {} as HandlerContext['db'],
		...overrides,
	}
}

function makeConfig(overrides?: Partial<Config>): Config {
	return {
		paths: { assets: '/app/assets/pieces' },
		sync: {
			cdn: { remote: 'my-cdn', path: 'assets/' },
			config: '/app/rclone.conf',
		},
		...overrides,
	} as unknown as Config
}

describe('handlers/cdn-sync', () => {
	let ctx: HandlerContext

	beforeEach(() => {
		ctx = makeContext({ config: makeConfig() })
	})

	test('skips when sync.cdn.remote is not configured', async () => {
		ctx.config = makeConfig({
			sync: { cdn: { remote: '', path: 'assets/' }, config: '/app/rclone.conf' },
		} as Partial<Config>)

		const handler = new CdnSync()
		const result = await handler.run(ctx)
		expect(result).toBe('skipped')
		expect(ctx.rclone.copy).not.toHaveBeenCalled()
	})

	test('skips when sync.cdn.path is not configured', async () => {
		ctx.config = makeConfig({
			sync: { cdn: { remote: 'my-cdn', path: '' }, config: '/app/rclone.conf' },
		} as Partial<Config>)

		const handler = new CdnSync()
		const result = await handler.run(ctx)
		expect(result).toBe('skipped')
		expect(ctx.rclone.copy).not.toHaveBeenCalled()
	})

	test('skips when sync.config is not configured', async () => {
		ctx.config = makeConfig({
			sync: {
				cdn: { remote: 'my-cdn', path: 'assets/' },
				config: '',
			},
		} as Partial<Config>)

		const handler = new CdnSync()
		const result = await handler.run(ctx)
		expect(result).toBe('skipped')
		expect(ctx.rclone.copy).not.toHaveBeenCalled()
	})

	test('calls rclone.copy with correct options', async () => {
		const handler = new CdnSync()
		const result = await handler.run(ctx)

		expect(result).toBe('ok')
		expect(ctx.rclone.copy).toHaveBeenCalledWith({
			localPath: '/app/assets/pieces',
			remote: 'my-cdn',
			remotePath: 'assets/',
			configPath: '/app/rclone.conf',
		})
		expect(ctx.logger.info).toHaveBeenCalledWith(
			'cdn.sync starting copy',
			expect.any(Object)
		)
	})

	test('throws when rclone.copy fails', async () => {
		const copyError = new Error('rclone failed')
		ctx = makeContext({
			config: makeConfig(),
			rclone: {
				bisync: vi.fn(),
				copy: vi.fn().mockRejectedValue(copyError),
			} as unknown as RcloneClient,
		})

		const handler = new CdnSync()

		await expect(handler.run(ctx)).rejects.toThrow('rclone failed')
	})
})
