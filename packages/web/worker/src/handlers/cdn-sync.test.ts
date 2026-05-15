import { describe, test, expect, vi, beforeEach } from 'vitest'
import { CdnSync } from './cdn-sync.js'
import { setWorkerContext, type WorkerContext } from './context.js'
import type { RcloneClient } from '../lib/rclone.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

function makeContext(overrides?: Partial<WorkerContext>): WorkerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}

	const rclone: RcloneClient = {
		bisync: vi.fn().mockResolvedValue(undefined),
		sync: vi.fn().mockResolvedValue(undefined),
	} as unknown as RcloneClient

	return {
		config: {} as Config,
		logger,
		rclone,
		db: {} as WorkerContext['db'],
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
	let ctx: WorkerContext

	beforeEach(() => {
		ctx = makeContext({ config: makeConfig() })
		setWorkerContext(ctx)
	})

	test('skips when sync.cdn.remote is not configured', async () => {
		ctx.config = makeConfig({
			sync: { cdn: { remote: '', path: 'assets/' }, config: '/app/rclone.conf' },
		} as Partial<Config>)

		const handler = new CdnSync()
		const result = await handler.run()
		expect(result).toBe('skipped')
		expect(ctx.rclone.sync).not.toHaveBeenCalled()
	})

	test('skips when sync.cdn.path is not configured', async () => {
		ctx.config = makeConfig({
			sync: { cdn: { remote: 'my-cdn', path: '' }, config: '/app/rclone.conf' },
		} as Partial<Config>)

		const handler = new CdnSync()
		const result = await handler.run()
		expect(result).toBe('skipped')
		expect(ctx.rclone.sync).not.toHaveBeenCalled()
	})

	test('skips when sync.config is not configured', async () => {
		ctx.config = makeConfig({
			sync: {
				cdn: { remote: 'my-cdn', path: 'assets/' },
				config: '',
			},
		} as Partial<Config>)

		const handler = new CdnSync()
		const result = await handler.run()
		expect(result).toBe('skipped')
		expect(ctx.rclone.sync).not.toHaveBeenCalled()
	})

	test('calls rclone.sync with correct options', async () => {
		const handler = new CdnSync()
		const result = await handler.run()

		expect(result).toBe('ok')
		expect(ctx.rclone.sync).toHaveBeenCalledWith({
			localPath: '/app/assets/pieces',
			remote: 'my-cdn',
			remotePath: 'assets/',
			configPath: '/app/rclone.conf',
		})
		expect(ctx.logger.info).toHaveBeenCalledWith(
			'cdn.sync starting sync',
			expect.any(Object)
		)
	})

	test('throws when rclone.sync fails', async () => {
		const syncError = new Error('rclone failed')
		ctx = makeContext({
			config: makeConfig(),
			rclone: {
				bisync: vi.fn(),
				sync: vi.fn().mockRejectedValue(syncError),
			} as unknown as RcloneClient,
		})
		setWorkerContext(ctx)

		const handler = new CdnSync()

		await expect(handler.run()).rejects.toThrow('rclone failed')
	})
})
