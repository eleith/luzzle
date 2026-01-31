import { describe, test, vi, afterEach, expect } from 'vitest'
import sync from './index.js'
import { loadConfig } from '@luzzle/web.utils/server'
import { getDatabaseClient, Pieces, selectItemAssets, LuzzleDatabase, LuzzleStorage, Piece, PieceFrontmatter } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { Readable } from 'stream'
import { Config } from '@luzzle/web.utils'

vi.mock('@luzzle/web.utils/server')
vi.mock('@luzzle/core')
vi.mock('../../lib/storage.js')

const mocks = {
	loadConfig: vi.mocked(loadConfig),
	getDatabaseClient: vi.mocked(getDatabaseClient),
	Pieces: vi.mocked(Pieces),
	getStorage: vi.mocked(getStorage),
	selectItemAssets: vi.mocked(selectItemAssets),
}

describe('sync index', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should sync schemas, items and prune assets', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const config = { paths: { database: 'db.sqlite' } }
		mocks.loadConfig.mockReturnValue(config as unknown as Config)
		mocks.getDatabaseClient.mockReturnValue({} as unknown as LuzzleDatabase)

		const storage = { delete: vi.fn() }
		mocks.getStorage.mockReturnValue(storage as unknown as LuzzleStorage)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi.fn().mockResolvedValue(Readable.from([{ action: 'updated', file: 'item1.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([{ action: 'pruned', file: 'item2.md' }])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([{ action: 'updated', name: 'books' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([{ action: 'pruned', name: 'films' }])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['book1.books.md'],
				assets: ['asset1.jpg', 'asset2.jpg'],
				directories: []
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)
		mocks.selectItemAssets.mockResolvedValue(['asset1.jpg'])

		await sync({
			configPath: 'config.yaml',
			prune: true,
			dryRun: false,
		})

		expect(mocks.loadConfig).toHaveBeenCalledWith('config.yaml')
		expect(mocks.getStorage).toHaveBeenCalled()
		expect(mocks.getDatabaseClient).toHaveBeenCalled()
		expect(piecesMock.sync).toHaveBeenCalledWith(expect.any(Object), { dryRun: false, force: false })
		expect(piecesMock.prune).toHaveBeenCalledWith(expect.any(Object), { dryRun: false })
		expect(piecesMock.getFilesIn).toHaveBeenCalled()
		expect(piecesMock.getPiece).toHaveBeenCalledWith('books')
		expect(pieceMock.sync).toHaveBeenCalled()
		expect(pieceMock.prune).toHaveBeenCalled()
		expect(storage.delete).toHaveBeenCalledWith('asset2.jpg')
		expect(consoleLogSpy).toHaveBeenCalledWith('[updated] schema: books')
		expect(consoleLogSpy).toHaveBeenCalledWith('[pruned] schema: films')
		expect(consoleLogSpy).toHaveBeenCalledWith('[updated] item: item1.md')
		expect(consoleLogSpy).toHaveBeenCalledWith('[pruned] item: item2.md')
		expect(consoleLogSpy).toHaveBeenCalledWith('[pruned] asset: asset2.jpg')
	})

	test('should handle dry run and no prune', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const config = { paths: { database: 'db.sqlite' } }
		mocks.loadConfig.mockReturnValue(config as unknown as Config)
		mocks.getDatabaseClient.mockReturnValue({} as unknown as LuzzleDatabase)
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(false),
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([{ action: 'skipped', name: 'books' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['book1.books.md'],
				assets: [],
				directories: []
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ dryRun: true })

		expect(consoleLogSpy).toHaveBeenCalledWith('--- DRY RUN ---')
		expect(piecesMock.sync).toHaveBeenCalledWith(expect.any(Object), { dryRun: true, force: false })
		expect(pieceMock.sync).toHaveBeenCalledWith(expect.any(Object), [], { dryRun: true, force: false }) // Empty array because not outdated
		expect(mocks.selectItemAssets).not.toHaveBeenCalled()
	})

	test('should force sync', async () => {
		const config = { paths: { database: 'db.sqlite' } }
		mocks.loadConfig.mockReturnValue(config as unknown as Config)
		mocks.getDatabaseClient.mockReturnValue({} as unknown as LuzzleDatabase)
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceMock = {
			isOutdated: vi.fn(),
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['book1.books.md'],
				assets: [],
				directories: []
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ force: true })

		expect(piecesMock.sync).toHaveBeenCalledWith(expect.any(Object), { dryRun: false, force: true })
		expect(pieceMock.isOutdated).not.toHaveBeenCalled() // skipped optimization
		expect(pieceMock.sync).toHaveBeenCalledWith(expect.any(Object), ['book1.books.md'], { dryRun: false, force: true })
	})
	
	test('should log errors', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const config = { paths: { database: 'db.sqlite' } }
		mocks.loadConfig.mockReturnValue(config as unknown as Config)
		mocks.getDatabaseClient.mockReturnValue({} as unknown as LuzzleDatabase)
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi.fn().mockResolvedValue(Readable.from([{ error: true, file: 'item1', message: 'fail' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([{ error: true, file: 'item2', message: 'fail' }])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([{ error: true, name: 's1', message: 'fail' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([{ error: true, name: 's2', message: 'fail' }])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['book1.books.md'],
				assets: [],
				directories: []
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({})

		expect(consoleErrorSpy).toHaveBeenCalledWith('[error] syncing schema s1: fail')
		expect(consoleErrorSpy).toHaveBeenCalledWith('[error] pruning schema s2: fail')
		expect(consoleErrorSpy).toHaveBeenCalledWith('[error] syncing item item1: fail')
		expect(consoleErrorSpy).toHaveBeenCalledWith('[error] pruning item item2: fail')
	})
})
