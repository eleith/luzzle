import { describe, test, vi, afterEach, expect } from 'vitest'
import sync from './index.js'
import {
	Pieces,
	selectItemAssets,
	LuzzleDatabase,
	LuzzleStorage,
	Piece,
	PieceFrontmatter,
	getFrontmatterValues,
} from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getConfig } from '../../lib/config.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import runWebMigrations from '../../database/migrations.js'
import { Readable } from 'stream'
import { Config } from '@luzzle/web.utils'

vi.mock('../../lib/config.js')
vi.mock('../../lib/database.js')
vi.mock('@luzzle/core')
vi.mock('../../lib/storage.js')
vi.mock('../../database/migrations.js')
vi.mock('@luzzle/web.utils/server')
vi.mock('../../lib/transforms/index.js', () => ({
	getTransforms: vi.fn().mockReturnValue(
		new Map([
			['attachment', { run: vi.fn().mockResolvedValue([]) }],
			['image', { run: vi.fn().mockResolvedValue([]) }],
			['opengraph', { run: vi.fn().mockResolvedValue([]) }],
		])
	),
	cleanupAllTransforms: vi.fn(),
}))

import { getTransforms, cleanupAllTransforms } from '../../lib/transforms/index.js'
import { generateAssetKey } from '@luzzle/web.utils/server'

const mocks = {
	getConfig: vi.mocked(getConfig),
	getDatabaseAndMigrate: vi.mocked(getDatabaseAndMigrate),
	Pieces: vi.mocked(Pieces),
	getStorage: vi.mocked(getStorage),
	selectItemAssets: vi.mocked(selectItemAssets),
	runWebMigrations: vi.mocked(runWebMigrations),
	getFrontmatterValues: vi.mocked(getFrontmatterValues),
	cleanupAllTransforms: vi.mocked(cleanupAllTransforms),
	generateAssetKey: vi.mocked(generateAssetKey)
}

function makeMockDb() {
	const queries = {
		where: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		selectAll: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue([]),
		executeTakeFirst: vi.fn().mockResolvedValue(undefined),
		values: vi.fn().mockReturnThis(),
		onConflict: vi.fn().mockImplementation((cb) => {
			cb?.({ column: vi.fn().mockReturnThis(), doUpdateSet: vi.fn().mockReturnThis() })
			return queries
		}),
		deleteFrom: vi.fn().mockReturnThis(),
		insertInto: vi.fn().mockReturnThis(),
	}
	const db = {
		selectFrom: vi.fn().mockReturnValue(queries),
		deleteFrom: vi.fn().mockReturnValue(queries),
		insertInto: vi.fn().mockReturnValue(queries),
		withTables: vi.fn().mockReturnThis(),
	} as unknown as LuzzleDatabase
	return { db, queries }
}

describe('sync index', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should sync schemas, items and prune assets', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
		vi.spyOn(console, 'error').mockImplementation(() => { })
		const config = { paths: { database: 'db.sqlite' }, pieces: [], assets: { salt: '' } }
		mocks.getConfig.mockReturnValue(config as unknown as Config)
		const { db } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })

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
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)
		mocks.selectItemAssets.mockResolvedValue(['asset1.jpg'])

		await sync(
			{
				outDir: '/tmp/test-out',
				prune: true,
				dryRun: false,
			},
			config as unknown as Config
		)

		expect(mocks.runWebMigrations).toHaveBeenCalledWith(db)
		expect(mocks.getStorage).toHaveBeenCalled()
		expect(mocks.getDatabaseAndMigrate).toHaveBeenCalled()
		expect(piecesMock.sync).toHaveBeenCalledWith(db, { dryRun: false, force: false })
		expect(piecesMock.prune).toHaveBeenCalledWith(db, { dryRun: false })
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
		const config = { paths: { database: 'db.sqlite' }, pieces: [], assets: { salt: '' } }
		const { db } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
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
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out', dryRun: true }, config as unknown as Config)

		expect(piecesMock.sync).toHaveBeenCalledWith(db, { dryRun: true, force: false })
		expect(pieceMock.sync).toHaveBeenCalledWith(db, [], { dryRun: true, force: false }) // Empty array because not outdated
		expect(mocks.selectItemAssets).not.toHaveBeenCalled()
	})

	test('should force sync', async () => {
		const config = { paths: { database: 'db.sqlite' }, pieces: [], assets: { salt: '' } }
		const { db } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
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
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out', force: true }, config as unknown as Config)

		expect(piecesMock.sync).toHaveBeenCalledWith(db, { dryRun: false, force: true })
		expect(pieceMock.isOutdated).not.toHaveBeenCalled() // skipped optimization
		expect(pieceMock.sync).toHaveBeenCalledWith(db, ['book1.books.md'], {
			dryRun: false,
			force: true,
		})
	})

	test('should handle dry run and prune', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
		const config = { paths: { database: 'db.sqlite' }, pieces: [], assets: { salt: '' } }
		const { db } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		const storage = { delete: vi.fn() }
		mocks.getStorage.mockReturnValue(storage as unknown as LuzzleStorage)

		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: [],
				pieces: [],
				assets: ['asset1.jpg'],
				directories: [],
			}),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)
		mocks.selectItemAssets.mockResolvedValue([])

		await sync({ outDir: '/tmp/test-out', dryRun: true, prune: true }, config as unknown as Config)

		expect(storage.delete).not.toHaveBeenCalled()
		expect(consoleLogSpy).toHaveBeenCalledWith('[pruned] asset: asset1.jpg')
	})

	test('should log errors', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
		const config = { paths: { database: 'db.sqlite' }, pieces: [], assets: { salt: '' } }
		const { db } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ error: true, file: 'item1', message: 'fail' }])),
			prune: vi
				.fn()
				.mockResolvedValue(Readable.from([{ error: true, file: 'item2', message: 'fail' }])),
		}
		const piecesMock = {
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ error: true, name: 's1', message: 'fail' }])),
			prune: vi
				.fn()
				.mockResolvedValue(Readable.from([{ error: true, name: 's2', message: 'fail' }])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['book1.books.md'],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(consoleErrorSpy).toHaveBeenCalledWith('[error] syncing schema s1: fail')
		expect(consoleErrorSpy).toHaveBeenCalledWith('[error] pruning schema s2: fail')
		expect(consoleErrorSpy).toHaveBeenCalledWith('[error] syncing item item1: fail')
		expect(consoleErrorSpy).toHaveBeenCalledWith('[error] pruning item item2: fail')
	})

	test('should throw if web migrations fail', async () => {
		const config = { paths: { database: 'db.sqlite' }, pieces: [], assets: { salt: '' } }
		const { db } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({
			results: [],
			error: new Error('web migration failed'),
		})
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)
		const piecesMock = {
			getFilesIn: vi.fn().mockResolvedValue({ types: [], pieces: [], assets: [], directories: [] }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await expect(sync({ outDir: '/tmp/test-out' }, config as unknown as Config)).rejects.toThrow(
			'Web migration failed:'
		)
	})

	test('should upsert web_pieces and tags when piece is added', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [
				{
					type: 'books',
					fields: {
						title: 'book_title',
						date_consumed: 'read_date',
						summary: 'book_summary',
						tags: 'book_tags',
					},
				},
			],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books',
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({
				book_title: 'My Book',
				book_tags: ['fiction'],
				book_summary: 'A summary',
			}),
			note_markdown: '',
			date_added: 1000,
			date_updated: 2000,
		}

		// selectFrom web_pieces (slug preload) returns empty
		queries.execute.mockResolvedValueOnce([])
		// selectFrom pieces_items for the added file
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'added', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['/archive/book.books.md'],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)
		mocks.getFrontmatterValues.mockReturnValue([['fiction']])

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(db.insertInto).toHaveBeenCalledWith('web_pieces')
		expect(db.insertInto).toHaveBeenCalledWith('web_pieces_tags')
	})

	test('should generate asset keys and sanitize metadata when piece has assets', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [
				{
					type: 'books',
					fields: { title: 'book_title' },
				},
			],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books',
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({ book_title: 'My Book', cover: 'asset1.jpg' }),
			assets_json_array: JSON.stringify(['asset1.jpg']),
			note_markdown: '',
			date_added: 1000,
		}

		// selectFrom web_pieces (slug preload) returns empty
		queries.execute.mockResolvedValueOnce([])
		// selectFrom pieces_items for the added file
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'added', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['/archive/book.books.md'],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)
		
		mocks.generateAssetKey.mockImplementation((path) => `key-for-${path}`)

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(mocks.generateAssetKey).toHaveBeenCalledWith('asset1.jpg', 'test-salt')
		expect(db.insertInto).toHaveBeenCalledWith('web_pieces')
		expect(queries.values).toHaveBeenCalledWith(
			expect.objectContaining({
				json_metadata: JSON.stringify({ book_title: 'My Book', cover: 'key-for-asset1.jpg' }),
			})
		)
	})

	test('should deduplicate slug when collision occurs', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [
				{
					type: 'books',
					fields: { title: 'book_title', date_consumed: 'read_date' },
				},
			],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books',
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({ book_title: 'My Book' }),
			note_markdown: '',
			date_added: 1000,
		}

		// Pre-existing slug 'book' belongs to a different file — causes collision
		queries.execute.mockResolvedValueOnce([
			{ slug: 'book', file_path: '/archive/other.books.md', id: 'other-1' },
		])
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'added', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['/archive/book.books.md'],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(db.insertInto).toHaveBeenCalledWith('web_pieces')
	})

	test('should preserve existing slug on updated piece', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [
				{
					type: 'books',
					fields: { title: 'book_title', date_consumed: 'read_date' },
				},
			],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books',
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({ book_title: 'My Book' }),
			note_markdown: '',
			date_added: 1000,
		}

		// Pre-existing slug for this exact file
		queries.execute.mockResolvedValueOnce([
			{ slug: 'existing-slug', file_path: '/archive/book.books.md', id: 'piece-1' },
		])
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'updated', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['/archive/book.books.md'],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(db.insertInto).toHaveBeenCalledWith('web_pieces')
	})

	test('should upsert web_pieces when piece has no summary or tags fields', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [
				{
					type: 'books',
					fields: { title: 'book_title', date_consumed: 'read_date' },
				},
			],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books',
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({ book_title: 'My Book' }),
			note_markdown: '',
			date_added: 1000,
		}

		queries.execute.mockResolvedValueOnce([])
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'added', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['/archive/book.books.md'],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(db.insertInto).toHaveBeenCalledWith('web_pieces')
		// No tags inserted since pieceConfig has no tags field
		expect(db.insertInto).not.toHaveBeenCalledWith('web_pieces_tags')
	})

	test('should delete web_pieces when piece is pruned', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [{ type: 'books', fields: { title: 'title', date_consumed: 'date' } }],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		// selectFrom web_pieces (slug preload) returns empty
		queries.execute.mockResolvedValueOnce([])
		// selectFrom web_pieces for pruned piece lookup
		queries.executeTakeFirst.mockResolvedValueOnce({ id: 'piece-1' })

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(false),
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'pruned', file: '/archive/book.books.md' }])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: [],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(db.deleteFrom).toHaveBeenCalledWith('web_pieces')
	})

	test('should skip upsert when piece type has no matching pieceConfig', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [{ type: 'films', fields: { title: 'film_title', date_consumed: 'watch_date' } }],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books', // type not in config.pieces
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({ book_title: 'My Book' }),
			note_markdown: '',
			date_added: 1000,
		}

		queries.execute.mockResolvedValueOnce([])
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'added', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['/archive/book.books.md'],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(db.insertInto).not.toHaveBeenCalledWith('web_pieces')
	})

	test('should not write to web_pieces in dry run when piece is added', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [{ type: 'books', fields: { title: 'book_title', date_consumed: 'read_date' } }],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books',
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({ book_title: 'My Book' }),
			note_markdown: '',
			date_added: 1000,
		}

		queries.execute.mockResolvedValueOnce([])
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'added', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: ['/archive/book.books.md'],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out', dryRun: true }, config as unknown as Config)

		expect(db.insertInto).not.toHaveBeenCalledWith('web_pieces')
	})

	test('should run transforms, log results, and record in web_pieces_assets when piece is added', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [{ type: 'books', fields: { title: 'book_title', date_consumed: 'read_date' } }],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books',
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({ book_title: 'My Book' }),
			note_markdown: '',
			date_added: 1000,
		}

		queries.execute.mockResolvedValueOnce([])
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		vi.mocked(getTransforms().get('attachment')!.run).mockResolvedValueOnce([
			{
				transformation: 'attachment.original',
				asset_path: 'books/key/file.pdf',
				mime_type: 'application/pdf',
			},
		])

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'added', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi
				.fn()
				.mockResolvedValue({
					types: ['books'],
					pieces: ['/archive/book.books.md'],
					assets: [],
					directories: [],
				}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(getTransforms().get('attachment')!.run).toHaveBeenCalledOnce()
		expect(db.deleteFrom).toHaveBeenCalledWith('web_pieces_assets')
		expect(db.insertInto).toHaveBeenCalledWith('web_pieces_assets')
		expect(consoleLogSpy).toHaveBeenCalledWith(
			'[transform.attachment] generated books/key/file.pdf'
		)
		consoleLogSpy.mockRestore()
	})

	test('should log error and continue when transform throws', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [{ type: 'books', fields: { title: 'book_title', date_consumed: 'read_date' } }],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books',
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({ book_title: 'My Book' }),
			note_markdown: '',
			date_added: 1000,
		}

		queries.execute.mockResolvedValueOnce([])
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		vi.mocked(getTransforms().get('attachment')!.run).mockRejectedValueOnce(new Error('storage error'))

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'added', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi
				.fn()
				.mockResolvedValue({
					types: ['books'],
					pieces: ['/archive/book.books.md'],
					assets: [],
					directories: [],
				}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out' }, config as unknown as Config)

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('[transform.attachment] error for /archive/book.books.md')
		)
		consoleErrorSpy.mockRestore()
	})

	test('should not run transforms in dry run', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [{ type: 'books', fields: { title: 'book_title', date_consumed: 'read_date' } }],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		const pieceItem = {
			id: 'piece-1',
			type: 'books',
			file_path: '/archive/book.books.md',
			frontmatter_json: JSON.stringify({ book_title: 'My Book' }),
			note_markdown: '',
			date_added: 1000,
		}

		queries.execute.mockResolvedValueOnce([])
		queries.executeTakeFirst.mockResolvedValueOnce(pieceItem)

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(true),
			sync: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'added', file: '/archive/book.books.md' }])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi
				.fn()
				.mockResolvedValue({
					types: ['books'],
					pieces: ['/archive/book.books.md'],
					assets: [],
					directories: [],
				}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out', dryRun: true }, config as unknown as Config)

		expect(getTransforms().get('attachment')!.run).not.toHaveBeenCalled()
		expect(db.insertInto).not.toHaveBeenCalledWith('web_pieces_assets')
	})

	test('should not delete web_pieces in dry run when piece is pruned', async () => {
		const config = {
			paths: { database: 'db.sqlite' },
			assets: { salt: 'test-salt' },
			pieces: [{ type: 'books', fields: { title: 'title', date_consumed: 'date' } }],
		}
		const { db, queries } = makeMockDb()
		mocks.getDatabaseAndMigrate.mockResolvedValue(db)
		mocks.runWebMigrations.mockResolvedValue({ results: [], error: undefined })
		mocks.getStorage.mockReturnValue({} as unknown as LuzzleStorage)

		queries.execute.mockResolvedValueOnce([])
		queries.executeTakeFirst.mockResolvedValueOnce({ id: 'piece-1' })

		const pieceMock = {
			isOutdated: vi.fn().mockResolvedValue(false),
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi
				.fn()
				.mockResolvedValue(Readable.from([{ action: 'pruned', file: '/archive/book.books.md' }])),
		}
		const piecesMock = {
			sync: vi.fn().mockResolvedValue(Readable.from([])),
			prune: vi.fn().mockResolvedValue(Readable.from([])),
			getFilesIn: vi.fn().mockResolvedValue({
				types: ['books'],
				pieces: [],
				assets: [],
				directories: [],
			}),
			getPiece: vi.fn().mockResolvedValue(pieceMock as unknown as Piece<PieceFrontmatter>),
			parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		}
		mocks.Pieces.mockReturnValue(piecesMock as unknown as Pieces)

		await sync({ outDir: '/tmp/test-out', dryRun: true }, config as unknown as Config)

		expect(db.deleteFrom).not.toHaveBeenCalledWith('web_pieces')
	})
})
