import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import Pieces from './pieces.js'
import Piece from './piece.js'
import { fdir } from 'fdir'
import {
	addPiece,
	deletePiece,
	getPiece,
	getPieceSchemaFromFile,
	getPieces,
	updatePiece,
} from '@luzzle/core'
import { makeRegisteredPiece, makeSchema } from './piece.fixtures.js'
import { makeContext } from '../commands/context.fixtures.js'
import { stat } from 'fs/promises'
import { Stats } from 'fs'

vi.mock('./piece.js')
vi.mock('@luzzle/core')
vi.mock('fs/promises')
vi.mock('fdir', () => {
	const fdir = vi.fn()
	fdir.prototype = {
		withRelativePaths: vi.fn().mockReturnThis(),
		withDirs: vi.fn().mockReturnThis(),
		crawl: vi.fn().mockImplementation(() => ({
			sync: vi.fn().mockReturnValue([]),
		})),
	}
	return { fdir }
})

const directory = 'luzzle-pieces'
const spies: { [key: string]: MockInstance } = {}
const mocks = {
	getPieceSchemaFromFile: vi.mocked(getPieceSchemaFromFile),
	getPiece: vi.mocked(getPiece),
	getPieces: vi.mocked(getPieces),
	stat: vi.mocked(stat),
	addPiece: vi.mocked(addPiece),
	updatePiece: vi.mocked(updatePiece),
	deletePiece: vi.mocked(deletePiece),
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

	test('constructor', () => {
		const pieces = new Pieces(directory)

		expect(pieces.directory).toEqual('luzzle-pieces')
	})

	test('getPiece', async () => {
		const pieces = new Pieces(directory)
		const piece = pieces.getPiece('books')

		expect(piece).toBeInstanceOf(Piece)
	})

	test('getSchemaPath', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const path = pieces.getSchemaPath(type)

		expect(path).toMatch(new RegExp(`^${directory}.*${type}.json$`))
	})

	test('getSchema', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const schema = makeSchema(type)

		mocks.getPieceSchemaFromFile.mockReturnValueOnce(schema)

		const getSchema = pieces.getSchema(type)

		expect(getSchema).toEqual(schema)
	})

	test('getTypeFromFile', () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const file = `/path/to/slug.${type}.md`

		const result = pieces.getTypeFromFile(file)

		expect(result).toEqual(type)
	})

	test('getTypeFromFile returns null', () => {
		const pieces = new Pieces(directory)
		const file = `/path/to/slug.md`

		const result = pieces.getTypeFromFile(file)

		expect(result).toBeNull()
	})

	test('getTypes', async () => {
		const type = 'books'
		const pieces = new Pieces(directory)

		spies.crawl = vi.spyOn(fdir.prototype, 'crawl').mockReturnValue({
			sync: () => [`/path/to/${type}.json`],
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any)

		const types = await pieces.getTypes()

		expect(types).toEqual([type])
	})

	test('getFiles', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const onDisk = [
			'/path/to/hi.books.md',
			'/path/to/bye.books.md',
			'.assets/hi.jpg',
			'.hidden/books.md',
		]

		spies.getTypeFromFile = vi.spyOn(pieces, 'getTypeFromFile').mockReturnValue(type)
		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])
		spies.crawl = vi.spyOn(fdir.prototype, 'crawl').mockReturnValueOnce({
			sync: () => onDisk,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any)

		const items = await pieces.getFiles()

		expect(items).toEqual({
			pieces: { [type]: [onDisk[0], onDisk[1]] },
			assets: [onDisk[2]],
		})
	})

	test('sync', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const datePiece = new Date('2020-02-02').getTime()
		const dateModified = new Date('2021-02-02')
		const piece = makeRegisteredPiece({ name: type, date_added: datePiece })
		const { db } = makeContext()

		mocks.getPiece.mockResolvedValueOnce(null)
		mocks.stat.mockResolvedValueOnce({ mtime: dateModified } as Stats)
		mocks.updatePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockReturnValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValueOnce('schemaPath')

		await pieces.sync(db, false)

		expect(mocks.addPiece).toHaveBeenCalledOnce()
		expect(mocks.updatePiece).not.toHaveBeenCalledOnce()
	})

	test('sync dryRun', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const datePiece = new Date('2020-02-02').getTime()
		const dateModified = new Date('2021-02-02')
		const piece = makeRegisteredPiece({ name: type, date_added: datePiece })
		const { db } = makeContext()

		mocks.getPiece.mockResolvedValueOnce(null)
		mocks.stat.mockResolvedValueOnce({ mtime: dateModified } as Stats)
		mocks.updatePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockReturnValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValueOnce('schemaPath')

		await pieces.sync(db, true)

		expect(mocks.updatePiece).not.toHaveBeenCalledOnce()
		expect(mocks.addPiece).not.toHaveBeenCalledOnce()
	})

	test('sync update piece', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const datePiece = new Date('2020-02-02').getTime()
		const dateModified = new Date('2021-02-02')
		const piece = makeRegisteredPiece({ name: type, date_added: datePiece })
		const { db } = makeContext()

		mocks.getPiece.mockResolvedValueOnce(piece)
		mocks.stat.mockResolvedValueOnce({ mtime: dateModified } as Stats)
		mocks.updatePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockReturnValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValueOnce('schemaPath')

		await pieces.sync(db, false)

		expect(mocks.addPiece).not.toHaveBeenCalledOnce()
		expect(mocks.updatePiece).toHaveBeenCalledOnce()
	})

	test('sync update piece dryRun', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const datePiece = new Date('2020-02-02').getTime()
		const dateModified = new Date('2021-02-02')
		const piece = makeRegisteredPiece({ name: type, date_added: datePiece })
		const { db } = makeContext()

		mocks.getPiece.mockResolvedValueOnce(piece)
		mocks.stat.mockResolvedValueOnce({ mtime: dateModified } as Stats)
		mocks.updatePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockReturnValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValueOnce('schemaPath')

		await pieces.sync(db, true)

		expect(mocks.updatePiece).not.toHaveBeenCalledOnce()
		expect(mocks.addPiece).not.toHaveBeenCalledOnce()
	})

	test('sync throws error', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const datePiece = new Date('2020-02-02').getTime()
		const piece = makeRegisteredPiece({ name: type, date_added: datePiece })
		const { db } = makeContext()

		mocks.getPiece.mockResolvedValueOnce(piece)
		mocks.stat.mockRejectedValueOnce(new Error('file not found'))
		mocks.updatePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([type])
		spies.getSchema = vi.spyOn(pieces, 'getSchema').mockReturnValueOnce(piece.schema)
		spies.getSchemaPath = vi.spyOn(pieces, 'getSchemaPath').mockReturnValueOnce('schemaPath')

		const syncing = pieces.sync(db, true)

		expect(syncing).rejects.toThrow()
	})

	test('prune', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const piece = makeRegisteredPiece({ name: type })
		const { db } = makeContext()

		mocks.getPieces.mockResolvedValueOnce([{ ...piece, schema: 'schema' }])
		mocks.deletePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([])

		await pieces.prune(db, false)

		expect(mocks.deletePiece).toHaveBeenCalledOnce()
	})

	test('prune dryRun', async () => {
		const pieces = new Pieces(directory)
		const type = 'books'
		const piece = makeRegisteredPiece({ name: type })
		const { db } = makeContext()

		mocks.getPieces.mockResolvedValueOnce([{ ...piece, schema: 'schema' }])
		mocks.deletePiece.mockResolvedValueOnce()

		spies.getTypes = vi.spyOn(pieces, 'getTypes').mockResolvedValueOnce([])

		await pieces.prune(db, true)

		expect(mocks.deletePiece).not.toHaveBeenCalledOnce()
	})
})
