import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mkdir, readdir } from 'node:fs/promises'
import { ArchiveSync } from './archive-sync.js'
import { setWorkerContext, type WorkerContext } from './context.js'
import type { RcloneClient } from '../lib/rclone.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	readdir: vi.fn().mockResolvedValue([]),
}))

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
		vi.mocked(mkdir).mockResolvedValue(undefined)
		vi.mocked(readdir).mockResolvedValue([])
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

	test('passes resync=true when workdir has no .lst baseline', async () => {
		vi.mocked(readdir).mockResolvedValueOnce([])

		const handler = new ArchiveSync()
		const result = await handler.run()

		expect(result).toBe('ok')
		expect(ctx.rclone.bisync).toHaveBeenCalledWith({
			localPath: '/app/archive',
			remote: 'my-remote',
			remotePath: 'archive/',
			configPath: '/app/rclone.conf',
			workdir: '/app/rclone/bisync',
			resync: true,
		})
	})

	test('passes resync=false when workdir already has a .lst baseline', async () => {
		vi.mocked(readdir).mockResolvedValueOnce([
			'app_archive..archive__app_remote.path1.lst',
			'app_archive..archive__app_remote.path2.lst',
		] as unknown as Awaited<ReturnType<typeof readdir>>)

		const handler = new ArchiveSync()
		const result = await handler.run()

		expect(result).toBe('ok')
		expect(ctx.rclone.bisync).toHaveBeenCalledWith(
			expect.objectContaining({ resync: false })
		)
	})

	test('treats unreadable workdir as no baseline', async () => {
		vi.mocked(readdir).mockRejectedValueOnce(new Error('ENOENT'))

		const handler = new ArchiveSync()
		await handler.run()

		expect(ctx.rclone.bisync).toHaveBeenCalledWith(
			expect.objectContaining({ resync: true })
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
