import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import Pieces from './Pieces.js'
import Piece from './Piece.js'
import {
	addPiece,
	deletePiece,
	getPiece,
	getPieces,
	updatePiece,
} from './manager.js'
import { jsonToPieceSchema } from './json.schema.js'
import { makePieceMarkdown } from './utils/markdown.js'
import { type PieceFrontmatter } from './utils/frontmatter.js'
import { makePieceMock, makeRegisteredPiece, makeSchema, makeStorage } from './Piece.fixtures.js'
import { mockKysely } from '../database/database.mock.js'
import { StorageStat } from '../index.js'

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

describe('lib/pieces/pieces.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

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

	test('sync', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const datePiece = new Date('2020-02-02').getTime()
		const dateModified = new Date('2021-02-02')
		const piece = makeRegisteredPiece({ name: type, date_added: datePiece })
		const { db } = mockKysely()

		mocks.getPiece.mockResolvedValueOnce(null)
		mocks.updatePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockResolvedValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValueOnce('schemaPath')
		spies.stat = vi
			.spyOn(storage, 'stat')
			.mockResolvedValueOnce({ last_modified: dateModified } as StorageStat)

		await pieces.sync(db)

		expect(mocks.addPiece).toHaveBeenCalledOnce()
		expect(mocks.updatePiece).not.toHaveBeenCalledOnce()
	})


	test('sync update piece', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const datePiece = new Date('2020-02-02').getTime()
		const dateModified = new Date('2021-02-02')
		const piece = makeRegisteredPiece({ name: type, date_added: datePiece })
		const { db } = mockKysely()

		mocks.getPiece.mockResolvedValueOnce(piece)
		mocks.updatePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockResolvedValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValueOnce('schemaPath')
		spies.stat = vi
			.spyOn(storage, 'stat')
			.mockResolvedValueOnce({ last_modified: dateModified } as StorageStat)

		await pieces.sync(db)

		expect(mocks.addPiece).not.toHaveBeenCalledOnce()
		expect(mocks.updatePiece).toHaveBeenCalledOnce()
	})


	test('sync throws error', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const datePiece = new Date('2020-02-02').getTime()
		const piece = makeRegisteredPiece({ name: type, date_added: datePiece })
		const { db } = mockKysely()

		mocks.getPiece.mockResolvedValueOnce(piece)
		mocks.updatePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockResolvedValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValueOnce('schemaPath')
		spies.stat = vi.spyOn(storage, 'stat').mockRejectedValueOnce(new Error('Error'))

		const syncing = pieces.sync(db)

		await expect(syncing).rejects.toThrow()
	})

	test('prune', async () => {
		const storage = makeStorage('root')
		const pieces = new Pieces(storage)
		const type = 'books'
		const piece = makeRegisteredPiece({ name: type })
		const { db } = mockKysely()

		mocks.getPieces.mockResolvedValueOnce([{ ...piece, schema: 'schema' }])
		mocks.deletePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([])

		await pieces.prune(db)

		expect(mocks.deletePiece).toHaveBeenCalledOnce()
	})

})
