import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import Pieces, { PieceDirectories } from './pieces.js'
import Piece, { PieceDatabase } from './piece.js'
import { makeCacheSchema, makeMarkdownSample, makeValidator } from './piece.fixtures.js'
import { PieceCache } from './cache.js'
import CacheForType from '../cache.js'
import { PieceMarkDown, toValidatedMarkDown, toMarkDownString } from './markdown.js'
import { extract } from '../md.js'

vi.mock('fs')
vi.mock('fs/promises')
vi.mock('./log')
vi.mock('./pieces')
vi.mock('../md')
vi.mock('./markdown')

const mocks = {
	existsSync: vi.mocked(existsSync),
	mkdirSync: vi.mocked(mkdirSync),
	writeFile: vi.mocked(writeFile),
	toMarkDown: vi.mocked(toValidatedMarkDown),
	toMarkDownString: vi.mocked(toMarkDownString),
	extract: vi.mocked(extract),
	Pieces: vi.mocked(Pieces),
	PiecesRegister: vi.spyOn(Pieces.prototype, 'register'),
	PiecesDirectories: vi.spyOn(Pieces.prototype, 'directories'),
	PiecesCaches: vi.spyOn(Pieces.prototype, 'caches'),
	PiecesGetSlugs: vi.spyOn(Pieces.prototype, 'getSlugs'),
	PiecesGetSlugsUpdated: vi.spyOn(Pieces.prototype, 'getSlugsUpdated'),
	PiecesGetPath: vi.spyOn(Pieces.prototype, 'getPath'),
	PiecesGetFileName: vi.spyOn(Pieces.prototype, 'getFileName'),
	PiecesRemoveStaleCache: vi.spyOn(Pieces.prototype, 'removeStaleCache'),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/pieces/piece', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('constructor', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()

		new Piece(dir, piece, pieceValidator, pieceSchema)

		expect(mocks.Pieces).toHaveBeenCalledOnce()
		expect(mocks.PiecesRegister).toHaveBeenCalledWith(piece, pieceSchema)
	})

	test('directories', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()

		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesDirectories.mockReturnValueOnce({} as PieceDirectories)

		new Piece(dir, piece, pieceValidator, pieceSchema).directories

		expect(mocks.PiecesDirectories).toHaveBeenCalledWith(piece)
	})

	test('type, process, attach', async () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()

		mocks.PiecesRegister.mockReturnThis()

		const pieces = new Piece(dir, piece, pieceValidator, pieceSchema)

		const type = pieces.type
		await pieces.attach('', '')
		await pieces.process('')

		expect(type).toEqual(piece)
	})

	test('caches', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()

		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesCaches.mockReturnValueOnce({} as CacheForType<PieceCache<PieceDatabase>>)

		new Piece(dir, piece, pieceValidator, pieceSchema).caches

		expect(mocks.PiecesCaches).toHaveBeenCalledWith(piece)
	})

	test('getSlugs', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()

		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesGetSlugs.mockResolvedValueOnce([])

		new Piece(dir, piece, pieceValidator, pieceSchema).getSlugs()

		expect(mocks.PiecesGetSlugs).toHaveBeenCalledWith(piece)
	})

	test('getSlugsUpdated', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()
		const type = 'lastProcessed'

		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesGetSlugsUpdated.mockResolvedValueOnce([])

		new Piece(dir, piece, pieceValidator, pieceSchema).getSlugsUpdated(type)

		expect(mocks.PiecesGetSlugsUpdated).toHaveBeenCalledWith(piece, type)
	})

	test('getPath', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()
		const slug = 'slug'

		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesGetPath.mockReturnValueOnce('')

		new Piece(dir, piece, pieceValidator, pieceSchema).getPath(slug)

		expect(mocks.PiecesGetPath).toHaveBeenCalledWith(piece, slug)
	})

	test('getFileName', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()
		const slug = 'slug'

		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesGetFileName.mockReturnValueOnce('')

		new Piece(dir, piece, pieceValidator, pieceSchema).getFileName(slug)

		expect(mocks.PiecesGetFileName).toHaveBeenCalledWith(slug)
	})

	test('removeStaleCache', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()

		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesRemoveStaleCache.mockResolvedValue([])

		new Piece(dir, piece, pieceValidator, pieceSchema).removeStaleCache()

		expect(mocks.PiecesRemoveStaleCache).toHaveBeenCalledWith(piece)
	})

	test('exists', () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()
		const slug = 'slug'

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesGetPath.mockReturnValueOnce('')

		new Piece(dir, piece, pieceValidator, pieceSchema).exists(slug)

		expect(mocks.PiecesGetPath).toHaveBeenCalledWith(piece, slug)
		expect(mocks.existsSync).toHaveBeenCalledOnce()
	})

	test('get', async () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()
		const slug = 'slug'
		const path = '/path/to/slug.md'
		const extracted = {
			filename: path,
			markdown: 'markdown',
			frontmatter: { title: 'title' },
		} as PieceMarkDown<PieceDatabase, ''>

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.toMarkDown.mockReturnValueOnce(extracted)
		mocks.extract.mockResolvedValueOnce(extracted as Awaited<ReturnType<typeof extract>>)
		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesGetPath.mockReturnValue(path)
		mocks.PiecesGetFileName.mockReturnValueOnce(path)

		const get = await new Piece(dir, piece, pieceValidator, pieceSchema).get(slug)

		expect(extract).toHaveBeenCalledWith(path)
		expect(get).toEqual(extracted)
	})

	test('get returns null', async () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()
		const slug = 'slug'

		mocks.existsSync.mockReturnValueOnce(false)
		mocks.PiecesRegister.mockReturnThis()

		const get = await new Piece(dir, piece, pieceValidator, pieceSchema).get(slug)

		expect(get).toEqual(null)
	})

	test('create', async () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()
		const slug = 'slug'
		const path = '/path/to/slug.md'
		const notes = 'markdown'
		const frontmatter = { title: 'title' }
		const extracted = {
			filename: path,
			markdown: notes,
			frontmatter,
		} as PieceMarkDown<PieceDatabase, ''>

		mocks.toMarkDown.mockReturnValueOnce(extracted)
		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesGetPath.mockReturnValueOnce(path)
		mocks.PiecesGetFileName.mockReturnValueOnce(path)

		const created = new Piece(dir, piece, pieceValidator, pieceSchema).create(
			slug,
			notes,
			frontmatter
		)

		expect(toValidatedMarkDown).toHaveBeenCalledOnce()
		expect(created).toEqual(extracted)
	})

	test('write', async () => {
		const dir = 'somewhere'
		const piece = 'books'
		const pieceValidator = makeValidator()
		const pieceSchema = makeCacheSchema()
		const slug = 'slug'
		const path = '/path/to/slug.md'
		const sample = makeMarkdownSample()

		spies.cacheUpdate = vi.fn(async () => '')
		mocks.toMarkDownString.mockReturnValueOnce('')
		mocks.writeFile.mockResolvedValueOnce(undefined)
		mocks.PiecesRegister.mockReturnThis()
		mocks.PiecesGetPath.mockReturnValueOnce(path)
		mocks.PiecesCaches.mockReturnValueOnce({
			update: spies.cacheUpdate,
		} as unknown as CacheForType<PieceCache<PieceDatabase>>)

		await new Piece(dir, piece, pieceValidator, pieceSchema).write(slug, sample)

		expect(mocks.writeFile).toHaveBeenCalledOnce()
		expect(spies.cacheUpdate).toHaveBeenCalledOnce()
	})
})
