import type { MockInstance } from 'vitest';
import { describe, expect, test, vi, afterEach, beforeEach } from 'vitest'
import Pieces from './Pieces.js'
import Piece from './Piece.js'
import { addPiece, deletePiece, getPiece, getPieces, updatePiece } from './manager.js'
import { jsonToPieceSchema } from './json.schema.js'
import { makePieceMarkdown } from './utils/markdown.js'
import { type PieceFrontmatter } from './utils/frontmatter.js'
import { makePieceMock, makeRegisteredPiece, makeSchema, makeStorage } from './Piece.fixtures.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { type LuzzleDatabase } from '../database/tables/index.js'
import type { StorageStat } from '../index.js'
import { Readable } from 'stream'

vi.mock('./Piece.js')
vi.mock('./manager.js')
vi.mock('./json.schema.js')
vi.mock('./utils/markdown.js')

const spies: { [key: string]: MockInstance } = {}
const mocks = {
	getPiece: vi.mocked(getPiece),
	getPieces: vi.mocked(getPieces),
	addPiece: vi.mocked(addPiece),
	updatePiece: vi.mocked(updatePiece),
	deletePiece: vi.mocked(deletePiece),
	jsonToPieceSchema: vi.mocked(jsonToPieceSchema),
}

let db: LuzzleDatabase

beforeEach(async () => {
	db = await setupDatabase()
})

afterEach(async () => {
	await teardownDatabase(db)

	Object.values(mocks).forEach((mock) => {
		mock.mockReset()
	})

	Object.keys(spies).forEach((key) => {
		spies[key].mockRestore()
		delete spies[key]
	})
})

describe('pieces/Pieces.ts', () => {
	test('getPiece', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const piece = await pieces.getPiece('books')

		expect(piece).toBeInstanceOf(Piece)
	})

	test('getPieceMarkdown', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const file = '/path/to/slug.books.md'
		const frontmatter: PieceFrontmatter = { title: 'Hello', date: '2020-01-01' }
		const content = 'This is the content'
		const pieceMarkdown = makePieceMarkdown(file, type, content, frontmatter)
		const pieceMock = makePieceMock()
		const piece = new pieceMock()

		spies.getPiece = vi.spyOn(pieces, 'getPiece').mockResolvedValueOnce(piece)
		spies.get = vi.spyOn(piece, 'get').mockResolvedValueOnce(pieceMarkdown)

		const getMarkdown = await pieces.getPieceMarkdown(file)

		expect(getMarkdown).toEqual(pieceMarkdown)
	})

	test('getPieceMarkdown throws if no type is found', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const file = '/path/to/slug.md'
		const frontmatter: PieceFrontmatter = { title: 'Hello', date: '2020-01-01' }
		const content = 'This is the content'
		const pieceMarkdown = makePieceMarkdown(file, type, content, frontmatter)
		const pieceMock = makePieceMock()
		const piece = new pieceMock()

		spies.getPiece = vi.spyOn(pieces, 'getPiece').mockResolvedValueOnce(piece)
		spies.get = vi.spyOn(piece, 'get').mockResolvedValueOnce(pieceMarkdown)

		const getMarkdownAwait = pieces.getPieceMarkdown(file)

		await expect(getMarkdownAwait).rejects.toThrow()
	})

	test('getPieceAsset', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const file = '.assets/path/to/asset.jpg'
		const buffer = Buffer.from('filedata')

		spies.readFiel = vi.spyOn(storage, 'readFile').mockResolvedValueOnce(buffer)

		const getAsset = await pieces.getPieceAsset(file)

		expect(getAsset).toEqual(buffer)
	})

	test('getSchemas', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const schemaPaths = ['path/to/books.json', 'path/to/authors.json']

		spies.readdir = vi.spyOn(storage, 'getFilesIn').mockResolvedValueOnce(schemaPaths)

		const schemas = await pieces.getSchemas()

		expect(schemas).toEqual(schemaPaths)
	})

	test('getSchema', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const schema = makeSchema(type)

		mocks.jsonToPieceSchema.mockReturnValueOnce(schema)

		const getSchema = await pieces.getSchema(type)

		expect(getSchema).toEqual(schema)
	})

	test('parseFilename', () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const file = `/path/to/slug.${type}.md`

		const result = pieces.parseFilename(file)

		expect(result.type).toEqual(type)
	})

	test('parseFilename returns null', () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const file = `/path/to/slug.md`

		const result = pieces.parseFilename(file)

		expect(result.type).toBeNull()
	})

	test('getTypes', async () => {
		const storage = makeStorage('root')
		const schemaNames = ['one', 'two']
		const pieces = new Pieces(storage)
		const schemas = schemaNames.map((x) => `path/to/${x}.json`)

		spies.getSchemas = vi.spyOn(pieces, 'getSchemas').mockResolvedValueOnce(schemas)

		const types = await pieces.getTypes()

		expect(types).toEqual(schemaNames)
	})

	test('isAsset', () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		expect(pieces.isAsset('.assets/path/to/image.png')).toBe(true)
		expect(pieces.isAsset('.assets')).toBe(true)
		expect(pieces.isAsset('path/to/.assets/image.png')).toBe(false)
		expect(pieces.isAsset('books/cover.jpg')).toBe(false)
	})

	test('getFilesIn', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const onDisk = [
			'/path/to/hi.books.md',
			'/path/to/bye.books.md',
			'.assets/hi.jpg',
			'.hidden/books.md',
			'/path/dir/',
		]

		spies.readdir = vi.spyOn(storage, 'getFilesIn').mockResolvedValueOnce(onDisk)
		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])

		const items = await pieces.getFilesIn('.')

		expect(items).toEqual({
			pieces: [onDisk[0], onDisk[1]],
			assets: [onDisk[2]],
			types: [type],
			directories: [onDisk[4]],
		})
	})

	test('syncGenerator', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const dateAdded = new Date('2020-02-02')
		const dateModified = new Date('2021-02-02')
		const piece = makeRegisteredPiece({ name: 'books', date_added: dateAdded.getTime() })

		mocks.getPiece
			.mockResolvedValueOnce(piece)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(piece)
		mocks.updatePiece.mockResolvedValueOnce()
		mocks.addPiece.mockResolvedValueOnce()

		spies.getTypes = vi
			.spyOn(pieces, 'getTypes')
			.mockResolvedValueOnce([piece.name, piece.name, piece.name])
		spies.getSchema = vi
			.spyOn(pieces, 'getSchema')
			.mockResolvedValueOnce(piece.schema)
			.mockResolvedValueOnce(piece.schema)
			.mockResolvedValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValue('schemaPath')
		spies.stat = vi
			.spyOn(storage, 'stat')
			.mockResolvedValueOnce({ last_modified: dateModified } as StorageStat)
			.mockResolvedValueOnce({ last_modified: dateModified } as StorageStat)
			.mockResolvedValueOnce({ last_modified: dateAdded } as StorageStat)

		const gen = await pieces.sync(db)
		const added: string[] = []
		const updated: string[] = []

		for await (const result of gen) {
			if (!result.error) {
				if (result.action === 'added') {
					added.push(result.name)
				} else if (result.action === 'updated') {
					updated.push(result.name)
				}
			}
		}

		expect(added).toHaveLength(1)
		expect(updated).toHaveLength(1)
		expect(mocks.addPiece).toHaveBeenCalledOnce()
		expect(mocks.updatePiece).toHaveBeenCalledOnce()
	})

	test('syncGenerator error add', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const dateAdded = new Date('2020-02-02').getTime()
		const dateModified = new Date('2021-02-02')
		const piece = makeRegisteredPiece({ name: 'books', date_added: dateAdded })

		mocks.getPiece.mockResolvedValueOnce(null)
		mocks.addPiece.mockRejectedValueOnce(new Error('Error adding piece'))

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([piece.name])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockResolvedValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValue('schemaPath')
		spies.stat = vi
			.spyOn(storage, 'stat')
			.mockResolvedValueOnce({ last_modified: dateModified } as StorageStat)

		const gen = await pieces.sync(db)
		const errors: string[] = []

		for await (const result of gen) {
			if (result.error) {
				errors.push(result.name)
			}
		}

		expect(errors).toHaveLength(1)
		expect(mocks.addPiece).toHaveBeenCalledOnce()
	})

	test('syncGenerator error schema', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const dateAdded = new Date('2020-02-02').getTime()
		const piece = makeRegisteredPiece({ name: 'books', date_added: dateAdded })

		mocks.getPiece.mockResolvedValueOnce(null)
		mocks.addPiece.mockRejectedValueOnce(new Error('Error adding piece'))

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([piece.name])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockResolvedValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValue('schemaPath')
		spies.stat = vi.spyOn(storage, 'stat').mockRejectedValueOnce(new Error('File not found'))

		const gen = await pieces.sync(db)
		const errors: string[] = []

		for await (const result of gen) {
			if (result.error) {
				errors.push(result.name)
			}
		}

		expect(errors).toHaveLength(1)
		expect(mocks.addPiece).not.toHaveBeenCalledOnce()
	})

	test('pruneGenerator', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const piece = makeRegisteredPiece({ name: type })

		mocks.getPieces.mockResolvedValueOnce([{ ...piece, schema: 'schema' }])
		mocks.deletePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([])

		const gen = await pieces.prune(db)
		const processed: string[] = []

		for await (const result of gen) {
			if (!result.error && result.action === 'pruned') {
				processed.push(result.name)
			}
		}

		expect(processed).toHaveLength(1)
		expect(mocks.deletePiece).toHaveBeenCalledOnce()
	})

	test('pruneGenerator error', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const piece = makeRegisteredPiece({ name: type })

		mocks.getPieces.mockResolvedValueOnce([{ ...piece, schema: 'schema' }])
		mocks.deletePiece.mockRejectedValueOnce(new Error('Error deleting piece'))

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([])

		const gen = await pieces.prune(db)
		const processed: string[] = []

		for await (const result of gen) {
			if (result.error) {
				processed.push(result.name)
			}
		}

		expect(processed).toHaveLength(1)
		expect(mocks.deletePiece).toHaveBeenCalledOnce()
	})

	test('diffSchemas reports added, updated, skipped and pruned', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const dateAdded = new Date('2020-02-02')
		const dateModified = new Date('2021-02-02')
		const piece = makeRegisteredPiece({ name: 'books', date_added: dateAdded.getTime() })

		mocks.getPiece
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(piece)
			.mockResolvedValueOnce(piece)
		mocks.getPieces.mockResolvedValueOnce([{ ...piece, name: 'gone' }])

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValue(['a', 'b', 'c'])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockResolvedValue(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValue('schemaPath')
		spies.stat = vi
			.spyOn(storage, 'stat')
			.mockResolvedValueOnce({ last_modified: dateModified } as StorageStat)
			.mockResolvedValueOnce({ last_modified: dateModified } as StorageStat)
			.mockResolvedValueOnce({ last_modified: dateAdded } as StorageStat)

		const result = await pieces.diffSchemas(db)

		expect(result.added).toEqual(['a'])
		expect(result.updated).toEqual(['b'])
		expect(result.pruned).toEqual(['gone'])
	})

	test('diffSchemas with force marks existing schemas as updated', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const piece = makeRegisteredPiece({ name: 'books', date_added: new Date('2021-02-02').getTime() })

		mocks.getPiece.mockResolvedValueOnce(piece)
		mocks.getPieces.mockResolvedValueOnce([])

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValue(['a'])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockResolvedValue(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValue('schemaPath')
		spies.stat = vi
			.spyOn(storage, 'stat')
			.mockResolvedValueOnce({ last_modified: new Date('2020-01-01') } as StorageStat)

		const result = await pieces.diffSchemas(db, { force: true })

		expect(result.updated).toEqual(['a'])
	})

	test('diffSchemas skips schemas whose file is missing', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)

		mocks.getPiece.mockResolvedValueOnce(null)
		mocks.getPieces.mockResolvedValueOnce([])

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValue(['a'])
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValue('schemaPath')
		spies.stat = vi.spyOn(storage, 'stat').mockRejectedValueOnce(new Error('missing'))

		const result = await pieces.diffSchemas(db)

		expect(result).toEqual({ added: [], updated: [], pruned: [] })
	})

	test('diff aggregates schema and piece changes', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)

		spies.diffSchemas = vi
			.spyOn(pieces, 'diffSchemas')
			.mockResolvedValue({ added: ['blog'], updated: ['note'], pruned: ['old'] })
		spies.getFilesIn = vi.spyOn(pieces, 'getFilesIn').mockResolvedValue({
			types: ['books'],
			pieces: ['a.books.md', 'b.books.md', 'c.books.md'],
			assets: [],
			directories: [],
		})

		const fakePiece = {
			diff: vi.fn().mockResolvedValue(
				Readable.from([
					{ action: 'added', file: 'a.books.md' },
					{ action: 'updated', file: 'b.books.md' },
					{ action: 'skipped', file: 'c.books.md' },
				])
			),
			diffPrune: vi.fn().mockResolvedValue(['gone.books.md']),
		}
		spies.getPiece = vi
			.spyOn(pieces, 'getPiece')
			.mockResolvedValue(fakePiece as unknown as Piece<PieceFrontmatter>)

		const result = await pieces.diff(db)

		expect(result.schemas).toEqual({ added: ['blog'], updated: ['note'], pruned: ['old'] })
		expect(result.pieces.added).toEqual(['a.books.md'])
		expect(result.pieces.updated).toEqual(['b.books.md'])
		expect(result.pieces.pruned).toEqual(['gone.books.md'])
	})
})
