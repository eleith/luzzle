import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CachePurge } from './cache-purge.js'
import type { HandlerContext } from './context.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

function makeContext(cacheDir: string): HandlerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}

	return {
		config: { paths: { cache: cacheDir } } as Config,
		logger,
		rclone: {} as HandlerContext['rclone'],
		db: {} as HandlerContext['db'],
	}
}

let workDir: string

beforeEach(async () => {
	workDir = await mkdtemp(path.join(tmpdir(), 'cache-purge-test-'))
})

afterEach(async () => {
	await rm(workDir, { recursive: true, force: true })
})

describe('handlers/cache-purge', () => {
	test('removes all entries from the cache directory', async () => {
		await writeFile(path.join(workDir, 'a.html'), 'a')
		await writeFile(path.join(workDir, 'b.html'), 'b')
		await mkdir(path.join(workDir, 'nested'))
		await writeFile(path.join(workDir, 'nested', 'c.html'), 'c')

		const ctx = makeContext(workDir)
		const handler = new CachePurge()

		const result = await handler.run(ctx)

		expect(result).toBe('ok')
		const remaining = await readdir(workDir)
		expect(remaining).toEqual([])
	})

	test('leaves the cache directory itself in place', async () => {
		await writeFile(path.join(workDir, 'a.html'), 'a')

		const ctx = makeContext(workDir)
		const handler = new CachePurge()

		await handler.run(ctx)

		// readdir succeeds → directory still exists
		await expect(readdir(workDir)).resolves.toEqual([])
	})

	test('no-op when cache directory is empty', async () => {
		const ctx = makeContext(workDir)
		const handler = new CachePurge()

		const result = await handler.run(ctx)

		expect(result).toBe('ok')
		expect(ctx.logger.info).toHaveBeenCalledWith(
			'cache.purge starting',
			expect.objectContaining({ entries: 0 })
		)
	})

	test('skips when cache directory does not exist', async () => {
		const missing = path.join(workDir, 'does-not-exist')
		const ctx = makeContext(missing)
		const handler = new CachePurge()

		const result = await handler.run(ctx)

		expect(result).toBe('skipped')
		expect(ctx.logger.info).toHaveBeenCalledWith(
			'cache.purge skipped: cache directory does not exist',
			{ cacheDir: missing }
		)
	})
})
