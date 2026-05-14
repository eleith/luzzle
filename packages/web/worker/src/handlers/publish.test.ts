import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Publish } from './publish.js'
import { ArchiveSync } from './archive-sync.js'
import { LuzzleSync } from './luzzle-sync.js'
import { WebSync } from './web-sync.js'
import { AssetsGenerate } from './assets-generate.js'
import { CdnSync } from './cdn-sync.js'
import { CachePurge } from './cache-purge.js'
import type { HandlerContext } from './context.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('./archive-sync.js', () => ({ ArchiveSync: vi.fn() }))
vi.mock('./luzzle-sync.js', () => ({ LuzzleSync: vi.fn() }))
vi.mock('./web-sync.js', () => ({ WebSync: vi.fn() }))
vi.mock('./assets-generate.js', () => ({ AssetsGenerate: vi.fn() }))
vi.mock('./cdn-sync.js', () => ({ CdnSync: vi.fn() }))
vi.mock('./cache-purge.js', () => ({ CachePurge: vi.fn() }))

const mocks = {
	ArchiveSync: vi.mocked(ArchiveSync),
	LuzzleSync: vi.mocked(LuzzleSync),
	WebSync: vi.mocked(WebSync),
	AssetsGenerate: vi.mocked(AssetsGenerate),
	CdnSync: vi.mocked(CdnSync),
	CachePurge: vi.mocked(CachePurge),
}

function makeContext(): HandlerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}

	return {
		config: {} as Config,
		logger,
		rclone: {} as HandlerContext['rclone'],
		db: {} as HandlerContext['db'],
	}
}

function stubHandler(result: string = 'ok') {
	const instance = { run: vi.fn().mockResolvedValue(result) }
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ctor = vi.fn().mockReturnValue(instance) as any
	return { ctor, instance }
}

describe('handlers/publish', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test('runs all phases in order', async () => {
		const phases = [
			stubHandler(),
			stubHandler(),
			stubHandler(),
			stubHandler(),
			stubHandler(),
			stubHandler(),
		]
		mocks.ArchiveSync.mockImplementation(phases[0].ctor)
		mocks.LuzzleSync.mockImplementation(phases[1].ctor)
		mocks.WebSync.mockImplementation(phases[2].ctor)
		mocks.AssetsGenerate.mockImplementation(phases[3].ctor)
		mocks.CdnSync.mockImplementation(phases[4].ctor)
		mocks.CachePurge.mockImplementation(phases[5].ctor)

		const ctx = makeContext()
		const result = await new Publish().run(ctx)

		expect(result).toBe('ok')
		for (const phase of phases) {
			expect(phase.instance.run).toHaveBeenCalledWith(ctx)
		}
		const orders = phases.map((p) => p.instance.run.mock.invocationCallOrder[0])
		expect(orders).toEqual([...orders].sort((a, b) => a - b))
	})

	test('logs each phase start and result', async () => {
		const stubs = Array.from({ length: 6 }, () => stubHandler('skipped'))
		mocks.ArchiveSync.mockImplementation(stubs[0].ctor)
		mocks.LuzzleSync.mockImplementation(stubs[1].ctor)
		mocks.WebSync.mockImplementation(stubs[2].ctor)
		mocks.AssetsGenerate.mockImplementation(stubs[3].ctor)
		mocks.CdnSync.mockImplementation(stubs[4].ctor)
		mocks.CachePurge.mockImplementation(stubs[5].ctor)

		const ctx = makeContext()
		await new Publish().run(ctx)

		expect(ctx.logger.info).toHaveBeenCalledWith('publish phase starting: archive.sync')
		expect(ctx.logger.info).toHaveBeenCalledWith('publish phase done: cache.purge', {
			result: 'skipped',
		})
		expect(ctx.logger.info).toHaveBeenCalledWith('publish starting')
		expect(ctx.logger.info).toHaveBeenCalledWith('publish complete')
	})

	test('aborts on phase failure', async () => {
		const phases = Array.from({ length: 6 }, () => stubHandler())
		phases[2].instance.run.mockRejectedValueOnce(new Error('web.sync failed'))
		mocks.ArchiveSync.mockImplementation(phases[0].ctor)
		mocks.LuzzleSync.mockImplementation(phases[1].ctor)
		mocks.WebSync.mockImplementation(phases[2].ctor)
		mocks.AssetsGenerate.mockImplementation(phases[3].ctor)
		mocks.CdnSync.mockImplementation(phases[4].ctor)
		mocks.CachePurge.mockImplementation(phases[5].ctor)

		const ctx = makeContext()

		await expect(new Publish().run(ctx)).rejects.toThrow('web.sync failed')
		expect(phases[3].instance.run).not.toHaveBeenCalled()
		expect(phases[4].instance.run).not.toHaveBeenCalled()
		expect(phases[5].instance.run).not.toHaveBeenCalled()
	})
})
