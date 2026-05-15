import { describe, test, expect, vi, beforeEach } from 'vitest'
import { runLuzzleSync } from './luzzle-sync.js'
import {
	Pieces,
	StorageFileSystem,
	getDatabaseClient,
	migrate,
	type Pieces as PiecesType,
	type StorageFileSystem as StorageType,
	type LuzzleTables,
} from '@luzzle/core'
import type { Logger } from '../logger.js'
import type { Config } from '@luzzle/web.config'
import type { Kysely } from 'kysely'
import { Readable } from 'stream'

vi.mock('@luzzle/core', () => ({
	Pieces: vi.fn(),
	StorageFileSystem: vi.fn(),
	getDatabaseClient: vi.fn(),
	migrate: vi.fn(),
}))

vi.mock('../db.js', () => ({
	resolveDbPath: vi.fn(() => '/app/data/db.sqlite'),
}))

const mocks = {
	Pieces: vi.mocked(Pieces),
	StorageFileSystem: vi.mocked(StorageFileSystem),
	getDatabaseClient: vi.mocked(getDatabaseClient),
	migrate: vi.mocked(migrate),
}

type MockDb = Kysely<LuzzleTables>
type MockStorage = StorageType
type MockPieces = PiecesType

function makeLogger(): Logger {
	return {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
}

function makeConfig(): Config {
	return {
		storage: { root: '/app/archive' },
		paths: { database: 'data/db.sqlite', config: '/app/config.yaml' },
	} as Config
}

function asyncIterable<T>(items: T[]): AsyncIterable<T> {
	const readable = Readable.from(items)
	return readable[Symbol.asyncIterator]()
}

function makePieces(opts: Partial<{
	sync: MockPieces['sync']
	prune: MockPieces['prune']
	getFilesIn: MockPieces['getFilesIn']
	getPiece: MockPieces['getPiece']
	parseFilename: MockPieces['parseFilename']
}> = {}): MockPieces {
	return {
		sync: vi.fn().mockResolvedValue(asyncIterable([])),
		prune: vi.fn().mockResolvedValue(asyncIterable([])),
		getFilesIn: vi.fn().mockResolvedValue({ types: [], pieces: [] }),
		getPiece: vi.fn(),
		parseFilename: vi.fn(),
		...opts,
	} as unknown as MockPieces
}

function makePiece(opts: Partial<{
	sync: Awaited<ReturnType<MockPieces['getPiece']>>['sync']
	prune: Awaited<ReturnType<MockPieces['getPiece']>>['prune']
	isOutdated: Awaited<ReturnType<MockPieces['getPiece']>>['isOutdated']
}> = {}) {
	return {
		sync: vi.fn().mockResolvedValue(asyncIterable([])),
		prune: vi.fn().mockResolvedValue(asyncIterable([])),
		isOutdated: vi.fn().mockResolvedValue(true),
		...opts,
	}
}

describe('handlers/luzzle-sync-module', () => {
	let logger: Logger
	let config: Config

	beforeEach(() => {
		vi.clearAllMocks()
		logger = makeLogger()
		config = makeConfig()
	})

	test('runs schema sync and prune', async () => {
		const mockDb = {} as unknown as MockDb
		const mockStorage = {} as unknown as MockStorage
		const mockPieces = makePieces()

		mocks.StorageFileSystem.mockReturnValue(mockStorage)
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({})
		mocks.Pieces.mockReturnValue(mockPieces)

		await runLuzzleSync(config, logger)

		expect(StorageFileSystem).toHaveBeenCalledWith('/app/archive')
		expect(migrate).toHaveBeenCalledWith(mockDb)
		expect(mockPieces.sync).toHaveBeenCalledWith(mockDb, {})
		expect(mockPieces.prune).toHaveBeenCalledWith(mockDb, { dryRun: false })
		expect(mockPieces.getFilesIn).toHaveBeenCalledWith('.', { deep: true })
	})

	test('logs schema sync results', async () => {
		const mockDb = {} as unknown as MockDb
		const mockPieces = makePieces({
			sync: vi
				.fn()
				.mockResolvedValue(asyncIterable([{ action: 'added', name: 'books' }])),
		})

		mocks.StorageFileSystem.mockReturnValue({} as unknown as MockStorage)
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({})
		mocks.Pieces.mockReturnValue(mockPieces)

		await runLuzzleSync(config, logger)

		expect(logger.info).toHaveBeenCalledWith('schema added: books')
	})

	test('logs schema sync errors', async () => {
		const mockDb = {} as unknown as MockDb
		const mockPieces = makePieces({
			sync: vi.fn().mockResolvedValue(
				asyncIterable([{ error: true, name: 'bad', message: 'parse failed' }])
			),
		})

		mocks.StorageFileSystem.mockReturnValue({} as unknown as MockStorage)
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({})
		mocks.Pieces.mockReturnValue(mockPieces)

		await runLuzzleSync(config, logger)

		expect(logger.warn).toHaveBeenCalledWith(
			'schema sync error for bad: parse failed'
		)
	})

	test('runs item sync per type with only outdated files', async () => {
		const mockDb = {} as unknown as MockDb
		const mockPiece = makePiece({
			sync: vi
				.fn()
				.mockResolvedValue(asyncIterable([{ action: 'added', file: 'books/book.md' }])),
			isOutdated: vi.fn().mockResolvedValue(true),
		})
		const mockPieces = makePieces({
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['books/book.md'],
			}),
			getPiece: vi.fn().mockResolvedValue(mockPiece),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		})

		mocks.StorageFileSystem.mockReturnValue({} as unknown as MockStorage)
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({})
		mocks.Pieces.mockReturnValue(mockPieces)

		const result = await runLuzzleSync(config, logger)

		expect(mockPieces.getPiece).toHaveBeenCalledWith('books')
		expect(mockPiece.isOutdated).toHaveBeenCalledWith('books/book.md', mockDb)
		expect(mockPiece.sync).toHaveBeenCalledWith(mockDb, ['books/book.md'], {})
		expect(logger.info).toHaveBeenCalledWith('item added: books/book.md')
		expect(result.changedPaths).toEqual(['books/book.md'])
	})

	test('filters out non-outdated files before piece.sync', async () => {
		const mockDb = {} as unknown as MockDb
		const mockPiece = makePiece({
			sync: vi.fn().mockResolvedValue(asyncIterable([])),
			isOutdated: vi
				.fn()
				.mockImplementation(async (file) => file === 'books/changed.md'),
		})
		const mockPieces = makePieces({
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['books/unchanged.md', 'books/changed.md'],
			}),
			getPiece: vi.fn().mockResolvedValue(mockPiece),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		})

		mocks.StorageFileSystem.mockReturnValue({} as unknown as MockStorage)
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({})
		mocks.Pieces.mockReturnValue(mockPieces)

		await runLuzzleSync(config, logger)

		expect(mockPiece.sync).toHaveBeenCalledWith(mockDb, ['books/changed.md'], {})
	})

	test('returns changedPaths only for added/updated actions', async () => {
		const mockDb = {} as unknown as MockDb
		const mockPiece = makePiece({
			sync: vi.fn().mockResolvedValue(
				asyncIterable([
					{ action: 'added', file: 'books/new.md' },
					{ action: 'updated', file: 'books/changed.md' },
					{ action: 'skipped', file: 'books/same.md' },
				])
			),
		})
		const mockPieces = makePieces({
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['books/new.md', 'books/changed.md', 'books/same.md'],
			}),
			getPiece: vi.fn().mockResolvedValue(mockPiece),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		})

		mocks.StorageFileSystem.mockReturnValue({} as unknown as MockStorage)
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({})
		mocks.Pieces.mockReturnValue(mockPieces)

		const result = await runLuzzleSync(config, logger)
		expect(result.changedPaths).toEqual(['books/new.md', 'books/changed.md'])
	})

	test('logs item sync errors', async () => {
		const mockDb = {} as unknown as MockDb
		const mockPiece = makePiece({
			sync: vi.fn().mockResolvedValue(
				asyncIterable([{ error: true, file: 'bad.md', message: 'fail' }])
			),
		})
		const mockPieces = makePieces({
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['books/bad.md'],
			}),
			getPiece: vi.fn().mockResolvedValue(mockPiece),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		})

		mocks.StorageFileSystem.mockReturnValue({} as unknown as MockStorage)
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({})
		mocks.Pieces.mockReturnValue(mockPieces)

		await runLuzzleSync(config, logger)

		expect(logger.warn).toHaveBeenCalledWith('item sync error for bad.md: fail')
	})

	test('throws on migration failure', async () => {
		mocks.StorageFileSystem.mockReturnValue({} as unknown as MockStorage)
		mocks.getDatabaseClient.mockReturnValue({} as unknown as MockDb)
		mocks.migrate.mockResolvedValue({ error: 'migration failed' })

		await expect(runLuzzleSync(config, logger)).rejects.toThrow(
			'luzzle core migration failed: migration failed'
		)
	})

	test('runs item prune for pruned files', async () => {
		const mockDb = {} as unknown as MockDb
		const mockPiece = makePiece({
			prune: vi.fn().mockResolvedValue(
				asyncIterable([{ action: 'pruned', file: 'old.md' }])
			),
		})
		const mockPieces = makePieces({
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['books/book.md'],
			}),
			getPiece: vi.fn().mockResolvedValue(mockPiece),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		})

		mocks.StorageFileSystem.mockReturnValue({} as unknown as MockStorage)
		mocks.getDatabaseClient.mockReturnValue(mockDb)
		mocks.migrate.mockResolvedValue({})
		mocks.Pieces.mockReturnValue(mockPieces)

		await runLuzzleSync(config, logger)

		expect(mockPiece.prune).toHaveBeenCalledWith(mockDb, ['books/book.md'], {
			dryRun: false,
		})
		expect(logger.info).toHaveBeenCalledWith('item pruned: old.md')
	})
})
