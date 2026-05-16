import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Publish } from './publish.js'
import { ArchiveSync } from './archive-sync.js'
import { LuzzleSync } from './luzzle-sync.js'
import { WebSync } from './web-sync.js'
import { AssetsGenerate } from './assets-generate.js'
import { CdnSync } from './cdn-sync.js'
import { CachePurge } from './cache-purge.js'
import { JobProgress } from '../lib/job-progress.js'
import { setWorkerContext, type WorkerContext } from './context.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('./archive-sync.js', () => ({ ArchiveSync: vi.fn() }))
vi.mock('./luzzle-sync.js', () => ({ LuzzleSync: vi.fn() }))
vi.mock('./web-sync.js', () => ({ WebSync: vi.fn() }))
vi.mock('./assets-generate.js', () => ({ AssetsGenerate: vi.fn() }))
vi.mock('./cdn-sync.js', () => ({ CdnSync: vi.fn() }))
vi.mock('./cache-purge.js', () => ({ CachePurge: vi.fn() }))

vi.mock('../lib/job-progress.js', () => {
	return {
		JobProgress: vi.fn().mockImplementation(() => ({
			purgeOld: vi.fn().mockResolvedValue(undefined),
			start: vi.fn().mockResolvedValue(undefined),
			complete: vi.fn().mockResolvedValue(undefined),
			skip: vi.fn().mockResolvedValue(undefined),
			fail: vi.fn().mockResolvedValue(undefined)
		}))
	}
})

const mocks = {
	ArchiveSync: vi.mocked(ArchiveSync),
	LuzzleSync: vi.mocked(LuzzleSync),
	WebSync: vi.mocked(WebSync),
	AssetsGenerate: vi.mocked(AssetsGenerate),
	CdnSync: vi.mocked(CdnSync),
	CachePurge: vi.mocked(CachePurge),
	JobProgress: vi.mocked(JobProgress),
}

function makeContext(): WorkerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}

	return {
		config: {} as Config,
		logger,
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

function stubHandler<T>(result: T) {
	const instance = { run: vi.fn().mockResolvedValue(result) }
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ctor = vi.fn().mockReturnValue(instance) as any
	return { ctor, instance }
}

function wireStubs(opts: {
	archive?: { ctor: ReturnType<typeof vi.fn>; instance: { run: ReturnType<typeof vi.fn> } }
	luzzle?: ReturnType<typeof stubHandler<{ changedPaths: string[] }>>
	web?: ReturnType<typeof stubHandler<string>>
	assets?: ReturnType<typeof stubHandler<string>>
	cdn?: ReturnType<typeof stubHandler<string>>
	cache?: ReturnType<typeof stubHandler<string>>
}) {
	const archive = opts.archive ?? stubHandler<string>('ok')
	const luzzle = opts.luzzle ?? stubHandler({ changedPaths: [] })
	const web = opts.web ?? stubHandler<string>('ok')
	const assets = opts.assets ?? stubHandler<string>('ok')
	const cdn = opts.cdn ?? stubHandler<string>('ok')
	const cache = opts.cache ?? stubHandler<string>('ok')

	mocks.ArchiveSync.mockImplementation(archive.ctor)
	mocks.LuzzleSync.mockImplementation(luzzle.ctor)
	mocks.WebSync.mockImplementation(web.ctor)
	mocks.AssetsGenerate.mockImplementation(assets.ctor)
	mocks.CdnSync.mockImplementation(cdn.ctor)
	mocks.CachePurge.mockImplementation(cache.ctor)

	return { archive, luzzle, web, assets, cdn, cache }
}

describe('handlers/publish', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('runs all phases in order, threading changedPaths from luzzle.sync into web.sync + assets.generate', async () => {
		const phases = wireStubs({
			luzzle: stubHandler({ changedPaths: ['books/a.md', 'words/b.md'] }),
		})

		const ctx = makeContext()
		setWorkerContext(ctx)
		
		const publish = new Publish()
		// @ts-expect-error - mock property for test
		publish.id = 123
		
		const result = await publish.run()

		expect(result).toBe('ok')
		expect(phases.archive.instance.run).toHaveBeenCalledWith()
		expect(phases.luzzle.instance.run).toHaveBeenCalledWith()
		expect(phases.web.instance.run).toHaveBeenCalledWith({
			filePaths: ['books/a.md', 'words/b.md'],
		})
		expect(phases.assets.instance.run).toHaveBeenCalledWith({
			filePaths: ['books/a.md', 'words/b.md'],
		})
		expect(phases.cdn.instance.run).toHaveBeenCalledWith()
		expect(phases.cache.instance.run).toHaveBeenCalledWith()

		const orders = [
			phases.archive,
			phases.luzzle,
			phases.web,
			phases.assets,
			phases.cdn,
			phases.cache,
		].map((p) => p.instance.run.mock.invocationCallOrder[0])
		expect(orders).toEqual([...orders].sort((a, b) => a - b))
		
		// Assert job progress calls
		const progressInstance = mocks.JobProgress.mock.results[0].value
		expect(progressInstance.purgeOld).toHaveBeenCalled()
		expect(progressInstance.start).toHaveBeenCalledWith(123, 'archive.sync')
		expect(progressInstance.complete).toHaveBeenCalledWith(123, 'archive.sync')
		expect(progressInstance.start).toHaveBeenCalledWith(123, 'luzzle.sync')
		expect(progressInstance.complete).toHaveBeenCalledWith(123, 'luzzle.sync', '2 pieces changed')
	})

	test('passes empty filePaths through when nothing changed', async () => {
		const phases = wireStubs({})

		const ctx = makeContext()
		setWorkerContext(ctx)
		await new Publish().run()

		expect(phases.web.instance.run).toHaveBeenCalledWith({ filePaths: [] })
		expect(phases.assets.instance.run).toHaveBeenCalledWith({ filePaths: [] })
	})

	test('logs each phase and the final summary', async () => {
		wireStubs({
			luzzle: stubHandler({ changedPaths: ['books/a.md'] }),
		})

		const ctx = makeContext()
		setWorkerContext(ctx)
		await new Publish().run()

		expect(ctx.logger.info).toHaveBeenCalledWith('publish starting')
		expect(ctx.logger.info).not.toHaveBeenCalledWith('publish phase done: archive.sync') // Removed
		expect(ctx.logger.info).toHaveBeenCalledWith('publish complete')
	})

	test('aborts on web.sync failure', async () => {
		const phases = wireStubs({
			luzzle: stubHandler({ changedPaths: ['x.md'] }),
		})
		phases.web.instance.run.mockRejectedValueOnce(new Error('web.sync failed'))

		const ctx = makeContext()
		setWorkerContext(ctx)
		
		const publish = new Publish()
		// @ts-expect-error - mock property for test
		publish.id = 456

		await expect(publish.run()).rejects.toThrow('web.sync failed')
		expect(phases.assets.instance.run).not.toHaveBeenCalled()
		expect(phases.cdn.instance.run).not.toHaveBeenCalled()
		expect(phases.cache.instance.run).not.toHaveBeenCalled()
		
		const progressInstance = mocks.JobProgress.mock.results[0].value
		expect(progressInstance.fail).toHaveBeenCalledWith(456, 'web.sync', expect.any(Error))
	})
})
