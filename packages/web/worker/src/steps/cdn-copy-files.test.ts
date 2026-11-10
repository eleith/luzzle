import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { WorkerContext } from '../services/context.js'
import { cdnCopyFilesStep } from './cdn-copy-files.js'

let directory: string
let assets: string
let ctx: WorkerContext

beforeEach(async () => {
	directory = await realpath(await mkdtemp(path.join(tmpdir(), 'cdn-copy-files-')))
	assets = path.join(directory, 'assets')
	await mkdir(path.join(assets, 'target'), { recursive: true })
	await writeFile(path.join(assets, 'target', 'page.html'), 'page')
	await writeFile(path.join(assets, 'cover.png'), 'cover')
	await writeFile(path.join(assets, 'unrelated.html'), 'another piece')
	ctx = {
		config: {
			paths: { assets },
			sync: {
				config: '/app/rclone.conf',
				cdn: { remote: 'cdn', path: 'published/assets/', strategy: 'sync' },
			},
		},
		logger: { info: vi.fn() },
		rclone: { copy: vi.fn().mockResolvedValue(undefined), sync: vi.fn() },
	} as unknown as WorkerContext
})

afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

test('copies exactly the deduplicated files, never their directory or unrelated outputs', async () => {
	const result = await cdnCopyFilesStep.run(
		{ filePaths: ['target/page.html', 'cover.png', 'target/page.html'] },
		ctx
	)

	expect(result.status).toBe('completed')
	expect(
		vi.mocked(ctx.rclone.copy).mock.calls.map(([options]) => ({
			localPath: options.localPath,
			remotePath: options.remotePath,
		}))
	).toEqual([
		{ localPath: path.join(assets, 'target', 'page.html'), remotePath: 'published/assets/target' },
		{ localPath: path.join(assets, 'cover.png'), remotePath: 'published/assets' },
	])
	expect(ctx.rclone.sync).not.toHaveBeenCalled()
})

test('validates the whole list before copying any file', async () => {
	const outside = path.join(directory, 'outside.html')
	await writeFile(outside, 'not generated output')
	await symlink(outside, path.join(assets, 'escape.html'))

	await expect(
		cdnCopyFilesStep.run({ filePaths: ['cover.png', 'escape.html'] }, ctx)
	).rejects.toThrow(/symbolic link/)

	expect(ctx.rclone.copy).not.toHaveBeenCalled()
	expect(ctx.rclone.sync).not.toHaveBeenCalled()
})

test('an empty list does nothing and failed delivery remains a failure', async () => {
	await cdnCopyFilesStep.run({ filePaths: [] }, ctx)
	expect(ctx.rclone.copy).not.toHaveBeenCalled()
	const error = new Error('CDN unavailable')
	vi.mocked(ctx.rclone.copy).mockRejectedValueOnce(error)

	await expect(cdnCopyFilesStep.run({ filePaths: ['cover.png'] }, ctx)).rejects.toBe(error)

	expect(ctx.rclone.sync).not.toHaveBeenCalled()
})
