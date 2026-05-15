import { describe, test, expect, vi, beforeEach } from 'vitest'
import { ArchiveSync } from './archive-sync.js'
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
		copy: vi.fn().mockResolvedValue(undefined),
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
		storage: { root: '/app/archive' },
		sync: {
			archive: { remote: 'my-remote', path: 'archive/' },
			config: '/app/rclone.conf',
		},
		...overrides,
	} as unknown as Config
}

describe('handlers/archive-sync', () => {
	let ctx: WorkerContext

	beforeEach(() => {
		ctx = makeContext({ config: makeConfig() })
		setWorkerContext(ctx)
	})

	test('skips when sync.archive.remote is not configured', async () => {
		ctx.config = makeConfig({
			sync: { archive: { remote: '', path: 'archive/' }, config: '/app/rclone.conf' },
		})

		const handler = new ArchiveSync()
		const result = await handler.run()
		expect(result).toBe('skipped')
		expect(ctx.rclone.bisync).not.toHaveBeenCalled()
	})

	test('skips when sync.archive.path is not configured', async () => {
		ctx.config = makeConfig({
			sync: { archive: { remote: 'my-remote', path: '' }, config: '/app/rclone.conf' },
		})

		const handler = new ArchiveSync()
		const result = await handler.run()
		expect(result).toBe('skipped')
		expect(ctx.rclone.bisync).not.toHaveBeenCalled()
	})

	test('skips when sync.config is not configured', async () => {
		ctx.config = makeConfig({
			sync: {
				archive: { remote: 'my-remote', path: 'archive/' },
				config: '',
			},
		})

		const handler = new ArchiveSync()
		const result = await handler.run()
		expect(result).toBe('skipped')
		expect(ctx.rclone.bisync).not.toHaveBeenCalled()
	})

	test('calls rclone.bisync with correct options', async () => {
		const handler = new ArchiveSync()
		const result = await handler.run()

		expect(result).toBe('ok')
		expect(ctx.rclone.bisync).toHaveBeenCalledWith({
			localPath: '/app/archive',
			remote: 'my-remote',
			remotePath: 'archive/',
			configPath: '/app/rclone.conf',
			workdir: '/app/rclone/bisync',
		})
		expect(ctx.logger.info).toHaveBeenCalledWith(
			'archive.sync starting bisync',
			expect.any(Object)
		)
	})

	test('throws when rclone.bisync fails', async () => {
		const bisyncError = new Error('rclone failed')
		ctx = makeContext({
			config: makeConfig(),
			rclone: {
				bisync: vi.fn().mockRejectedValue(bisyncError),
				copy: vi.fn(),
			} as unknown as RcloneClient,
		})
		setWorkerContext(ctx)

		const handler = new ArchiveSync()

		await expect(handler.run()).rejects.toThrow('rclone failed')
	})
})
