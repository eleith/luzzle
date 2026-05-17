import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mkdir, readdir } from 'node:fs/promises'
import { archiveSyncStep } from './archive-sync.js'
import type { WorkerContext } from '../services/context.js'
import type { RcloneClient } from '../services/rclone.js'
import type { Config } from '@luzzle/web.config'

vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	readdir: vi.fn().mockResolvedValue([]),
}))

function makeCtx(overrides?: Partial<WorkerContext>): WorkerContext {
	const rclone: RcloneClient = {
		bisync: vi.fn().mockResolvedValue(undefined),
		sync: vi.fn().mockResolvedValue(undefined),
	} as unknown as RcloneClient
	return {
		config: {
			storage: { root: '/app/archive' },
			sync: {
				archive: { remote: 'r', path: 'archive/' },
				config: '/app/rclone.conf',
			},
		} as unknown as Config,
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		},
		rclone,
		db: {} as WorkerContext['db'],
		...overrides,
	}
}

describe('archiveSyncStep', () => {
	beforeEach(() => {
		vi.mocked(mkdir).mockResolvedValue(undefined)
		vi.mocked(readdir).mockResolvedValue([])
	})

	test('skips when remote/path not configured', async () => {
		const ctx = makeCtx({
			config: {
				storage: { root: '/x' },
				sync: { archive: { remote: '', path: '' }, config: '/c' },
			} as unknown as Config,
		})
		const result = await archiveSyncStep.run(undefined, ctx)
		expect(result.status).toBe('skipped')
		expect(ctx.rclone.bisync).not.toHaveBeenCalled()
	})

	test('skips when sync.config not set', async () => {
		const ctx = makeCtx({
			config: {
				storage: { root: '/x' },
				sync: { archive: { remote: 'r', path: 'a/' }, config: '' },
			} as unknown as Config,
		})
		const result = await archiveSyncStep.run(undefined, ctx)
		expect(result.status).toBe('skipped')
	})

	test('runs bisync with resync=true when no .lst baseline', async () => {
		vi.mocked(readdir).mockResolvedValueOnce([])
		const ctx = makeCtx()
		const result = await archiveSyncStep.run(undefined, ctx)
		expect(result.status).toBe('completed')
		expect(ctx.rclone.bisync).toHaveBeenCalledWith(
			expect.objectContaining({ resync: true })
		)
	})

	test('runs bisync with resync=false when .lst baseline exists', async () => {
		vi.mocked(readdir).mockResolvedValueOnce([
			'foo.lst',
		] as unknown as Awaited<ReturnType<typeof readdir>>)
		const ctx = makeCtx()
		await archiveSyncStep.run(undefined, ctx)
		expect(ctx.rclone.bisync).toHaveBeenCalledWith(
			expect.objectContaining({ resync: false })
		)
	})

	test('treats unreadable workdir as no baseline', async () => {
		vi.mocked(readdir).mockRejectedValueOnce(new Error('ENOENT'))
		const ctx = makeCtx()
		await archiveSyncStep.run(undefined, ctx)
		expect(ctx.rclone.bisync).toHaveBeenCalledWith(
			expect.objectContaining({ resync: true })
		)
	})

	test('rethrows when bisync fails', async () => {
		const rclone = {
			bisync: vi.fn().mockRejectedValue(new Error('boom')),
			sync: vi.fn(),
		} as unknown as RcloneClient
		const ctx = makeCtx({ rclone })
		await expect(archiveSyncStep.run(undefined, ctx)).rejects.toThrow('boom')
	})
})
