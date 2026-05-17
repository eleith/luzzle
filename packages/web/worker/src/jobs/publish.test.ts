import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Publish } from './publish.js'
import { archiveSyncStep } from '../steps/archive-sync.js'
import { luzzleSyncStep } from '../steps/luzzle-sync.js'
import { webSyncStep } from '../steps/web-sync/index.js'
import { assetsGenerateStep } from '../steps/assets-generate.js'
import { cdnSyncStep } from '../steps/cdn-sync.js'
import { cachePurgeStep } from '../steps/cache-purge.js'
import { JobProgress } from '../core/job-progress.js'
import { setWorkerContext, type WorkerContext } from '../services/context.js'
import { completed } from '../core/step.js'
import type { Logger } from '../services/logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('../steps/archive-sync.js', () => ({ archiveSyncStep: { name: 'archive.sync', run: vi.fn() } }))
vi.mock('../steps/luzzle-sync.js', () => ({ luzzleSyncStep: { name: 'luzzle.sync', run: vi.fn() } }))
vi.mock('../steps/web-sync/index.js', () => ({ webSyncStep: { name: 'web.sync', run: vi.fn() } }))
vi.mock('../steps/assets-generate.js', () => ({ assetsGenerateStep: { name: 'assets.generate', run: vi.fn() } }))
vi.mock('../steps/cdn-sync.js', () => ({ cdnSyncStep: { name: 'cdn.sync', run: vi.fn() } }))
vi.mock('../steps/cache-purge.js', () => ({ cachePurgeStep: { name: 'cache.purge', run: vi.fn() } }))

vi.mock('../core/job-progress.js', () => {
	return {
		JobProgress: vi.fn().mockImplementation(() => ({
			purgeOld: vi.fn().mockResolvedValue(undefined),
			start: vi.fn().mockResolvedValue(undefined),
			complete: vi.fn().mockResolvedValue(undefined),
			skip: vi.fn().mockResolvedValue(undefined),
			fail: vi.fn().mockResolvedValue(undefined),
		})),
	}
})

const stepMocks = {
	archive: vi.mocked(archiveSyncStep.run),
	luzzle: vi.mocked(luzzleSyncStep.run),
	web: vi.mocked(webSyncStep.run),
	assets: vi.mocked(assetsGenerateStep.run),
	cdn: vi.mocked(cdnSyncStep.run),
	cache: vi.mocked(cachePurgeStep.run),
	JobProgress: vi.mocked(JobProgress),
}

function makeContext(): WorkerContext {
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		stdout: vi.fn(),
		stderr: vi.fn(),
		setActivePhase: vi.fn(),
		clearActivePhase: vi.fn(),
	} satisfies Logger & {
		setActivePhase: (phase: { jobId: number; phase: string }) => void
		clearActivePhase: () => void
	}
	return {
		config: {} as Config,
		logger,
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

describe('jobs/publish', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		stepMocks.archive.mockResolvedValue(completed(undefined))
		stepMocks.luzzle.mockResolvedValue(completed({ changedPaths: [] }))
		stepMocks.web.mockResolvedValue(completed(undefined))
		stepMocks.assets.mockResolvedValue(completed(undefined))
		stepMocks.cdn.mockResolvedValue(completed(undefined))
		stepMocks.cache.mockResolvedValue(completed(undefined))
	})

	test('runs all phases in order, threading changedPaths from luzzle.sync into web.sync + assets.generate', async () => {
		stepMocks.luzzle.mockResolvedValueOnce(
			completed({ changedPaths: ['books/a.md', 'words/b.md'] })
		)

		const ctx = makeContext()
		setWorkerContext(ctx)

		const publish = new Publish()
		// @ts-expect-error - mock id
		publish.id = 123
		const result = await publish.run()

		expect(result).toBe('ok')
		expect(stepMocks.web).toHaveBeenCalledWith(
			{ filePaths: ['books/a.md', 'words/b.md'] },
			expect.anything()
		)
		expect(stepMocks.assets).toHaveBeenCalledWith(
			{ filePaths: ['books/a.md', 'words/b.md'] },
			expect.anything()
		)
		const order = [
			stepMocks.archive.mock.invocationCallOrder[0],
			stepMocks.luzzle.mock.invocationCallOrder[0],
			stepMocks.web.mock.invocationCallOrder[0],
			stepMocks.assets.mock.invocationCallOrder[0],
			stepMocks.cdn.mock.invocationCallOrder[0],
			stepMocks.cache.mock.invocationCallOrder[0],
		]
		expect(order).toEqual([...order].sort((a, b) => a - b))
	})

	test('passes empty filePaths through when nothing changed', async () => {
		setWorkerContext(makeContext())
		await new Publish().run()
		expect(stepMocks.web).toHaveBeenCalledWith({ filePaths: [] }, expect.anything())
		expect(stepMocks.assets).toHaveBeenCalledWith({ filePaths: [] }, expect.anything())
	})

	test('aborts on web.sync failure and never reaches assets/cdn/cache', async () => {
		stepMocks.luzzle.mockResolvedValueOnce(completed({ changedPaths: ['x.md'] }))
		stepMocks.web.mockRejectedValueOnce(new Error('web.sync failed'))

		setWorkerContext(makeContext())
		const publish = new Publish()
		// @ts-expect-error - mock id
		publish.id = 456

		await expect(publish.run()).rejects.toThrow('web.sync failed')
		expect(stepMocks.assets).not.toHaveBeenCalled()
		expect(stepMocks.cdn).not.toHaveBeenCalled()
		expect(stepMocks.cache).not.toHaveBeenCalled()
	})

	test('logs start and complete', async () => {
		const ctx = makeContext()
		setWorkerContext(ctx)
		await new Publish().run()
		expect(ctx.logger.info).toHaveBeenCalledWith('publish starting')
		expect(ctx.logger.info).toHaveBeenCalledWith('publish complete')
	})
})
