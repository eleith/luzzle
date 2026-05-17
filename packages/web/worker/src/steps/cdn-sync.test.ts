import { describe, test, expect, vi } from 'vitest'
import { cdnSyncStep } from './cdn-sync.js'
import type { WorkerContext } from '../services/context.js'
import type { RcloneClient } from '../services/rclone.js'
import type { Config } from '@luzzle/web.config'

function makeCtx(overrides?: Partial<WorkerContext>): WorkerContext {
	const rclone: RcloneClient = {
		bisync: vi.fn(),
		sync: vi.fn().mockResolvedValue(undefined),
	} as unknown as RcloneClient
	return {
		config: {
			paths: { assets: '/app/assets' },
			sync: {
				cdn: { remote: 'r', path: 'cdn/' },
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

describe('cdnSyncStep', () => {
	test('skips when remote/path not configured', async () => {
		const ctx = makeCtx({
			config: {
				paths: { assets: '/x' },
				sync: { cdn: { remote: '', path: '' }, config: '/c' },
			} as unknown as Config,
		})
		const result = await cdnSyncStep.run(undefined, ctx)
		expect(result.status).toBe('skipped')
	})

	test('skips when sync.config not set', async () => {
		const ctx = makeCtx({
			config: {
				paths: { assets: '/x' },
				sync: { cdn: { remote: 'r', path: 'p/' }, config: '' },
			} as unknown as Config,
		})
		const result = await cdnSyncStep.run(undefined, ctx)
		expect(result.status).toBe('skipped')
	})

	test('runs sync and completes', async () => {
		const ctx = makeCtx()
		const result = await cdnSyncStep.run(undefined, ctx)
		expect(result.status).toBe('completed')
		expect(ctx.rclone.sync).toHaveBeenCalledWith({
			localPath: '/app/assets',
			remote: 'r',
			remotePath: 'cdn/',
			configPath: '/app/rclone.conf',
		})
	})
})
