import { describe, test, expect, vi, beforeEach } from 'vitest'
import { AssetsGenerate } from './assets-generate.js'
import { runAssetsGenerate } from '../lib/assets-generate.js'
import { Pieces, StorageFileSystem } from '@luzzle/core'
import type { HandlerContext } from './context.js'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'

vi.mock('../lib/assets-generate.js')
vi.mock('@luzzle/core', () => ({
	Pieces: vi.fn(),
	StorageFileSystem: vi.fn(),
}))

const mocks = {
	runAssetsGenerate: vi.mocked(runAssetsGenerate),
	Pieces: vi.mocked(Pieces),
	StorageFileSystem: vi.mocked(StorageFileSystem),
}

function makeContext(): HandlerContext {
	const logger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}

	return {
		config: { storage: { root: '/app/archive' } } as Config,
		logger,
		rclone: {} as HandlerContext['rclone'],
		db: {} as HandlerContext['db'],
	}
}

describe('handlers/assets-generate', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.runAssetsGenerate.mockResolvedValue(undefined)
	})

	test('builds Pieces from config.storage.root and forwards to runAssetsGenerate', async () => {
		const fakeStorage = { kind: 'storage' }
		const fakePieces = { kind: 'pieces' }
		mocks.StorageFileSystem.mockReturnValue(fakeStorage as unknown as StorageFileSystem)
		mocks.Pieces.mockReturnValue(fakePieces as unknown as Pieces)

		const ctx = makeContext()
		const handler = new AssetsGenerate()

		const result = await handler.run(ctx)

		expect(mocks.StorageFileSystem).toHaveBeenCalledWith('/app/archive')
		expect(mocks.Pieces).toHaveBeenCalledWith(fakeStorage)
		expect(mocks.runAssetsGenerate).toHaveBeenCalledWith(
			ctx.db,
			fakePieces,
			ctx.config,
			ctx.logger
		)
		expect(result).toBe('ok')
	})

	test('throws when module throws', async () => {
		const ctx = makeContext()
		mocks.runAssetsGenerate.mockRejectedValueOnce(new Error('assets failed'))

		const handler = new AssetsGenerate()

		await expect(handler.run(ctx)).rejects.toThrow('assets failed')
	})
})
