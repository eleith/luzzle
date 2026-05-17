import { describe, test, expect, vi, beforeEach } from 'vitest'
import { readdir, rm } from 'node:fs/promises'
import { cachePurgeStep } from './cache-purge.js'
import type { WorkerContext } from '../services/context.js'
import type { Config } from '@luzzle/web.config'

vi.mock('node:fs/promises', () => ({
	readdir: vi.fn(),
	rm: vi.fn().mockResolvedValue(undefined),
}))

function makeCtx(cacheDir = '/tmp/cache'): WorkerContext {
	return {
		config: { paths: { cache: cacheDir } } as unknown as Config,
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		},
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

describe('cachePurgeStep', () => {
	beforeEach(() => {
		vi.mocked(readdir).mockReset()
		vi.mocked(rm).mockClear()
	})

	test('skips when cache dir is ENOENT', async () => {
		const err = Object.assign(new Error('not found'), { code: 'ENOENT' })
		vi.mocked(readdir).mockRejectedValueOnce(err)

		const result = await cachePurgeStep.run(undefined, makeCtx())
		expect(result.status).toBe('skipped')
		expect(rm).not.toHaveBeenCalled()
	})

	test('removes each entry and completes', async () => {
		vi.mocked(readdir).mockResolvedValueOnce(['a', 'b'] as unknown as Awaited<ReturnType<typeof readdir>>)
		const result = await cachePurgeStep.run(undefined, makeCtx('/tmp/cache'))
		expect(result.status).toBe('completed')
		expect(rm).toHaveBeenCalledWith('/tmp/cache/a', { recursive: true, force: true })
		expect(rm).toHaveBeenCalledWith('/tmp/cache/b', { recursive: true, force: true })
	})

	test('re-throws non-ENOENT errors', async () => {
		vi.mocked(readdir).mockRejectedValueOnce(new Error('boom'))
		await expect(cachePurgeStep.run(undefined, makeCtx())).rejects.toThrow('boom')
	})
})
