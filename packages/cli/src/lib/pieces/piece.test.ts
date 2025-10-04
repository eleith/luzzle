import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import {
	makeMarkdownSample,
	makePieceItemSelectable,
	makePieceMock,
	makeFrontmatterSample,
	makeSchema,
	makeStorage,
} from './piece.fixtures.js'
import { mockDatabase } from '../database.mock.js'
import { addCache, removeCache, updateCache, getCache } from './cache.js'
import log from '../log.js'
import { CpuInfo, cpus } from 'os'
import {
	getPieceFrontmatterSchemaFields,
	databaseValueToPieceFrontmatterValue,
	makePieceMarkdown,
	makePieceMarkdownString,
	extractFullMarkdown,
	initializePieceFrontMatter,
	PieceFrontmatterSchemaField,
	compile,
	makePieceItemInsertable,
	makePieceItemUpdatable,
	selectItems,
	deleteItems,
	selectItem,
	insertItem,
	updateItem,
	addPiece,
	updatePiece,
	getPiece,
	validatePieceItem,
	getValidatePieceItemErrors,
	LuzzleSelectable,
	LuzzleInsertable,
} from '@luzzle/core'
import {
	calculateHashFromFile,
	makePieceValue,
	makePieceAttachment,
} from './utils.js'
import { makeCache } from './cache.fixtures.js'
import slugify from '@sindresorhus/slugify'
import { mockStorage } from '../storage/storage.mock.js'
import { StorageStat } from '../storage/storage.js'
import { PassThrough, Readable } from 'stream'

vi.mock('../log.js')
vi.mock('../md.js')
vi.mock('./markdown.js')
vi.mock('../tags/index.js')
vi.mock('./cache.js')
vi.mock('os')
vi.mock('@luzzle/core')
vi.mock('./utils.js')
vi.mock('@sindresorhus/slugify')

const mocks = {
	makePieceMarkdown: vi.mocked(makePieceMarkdown),
	toMarkdown: vi.mocked(makePieceMarkdown),
	toMarkdownString: vi.mocked(makePieceMarkdownString),
	extract: vi.mocked(extractFullMarkdown),
	logError: vi.spyOn(log, 'error'),
	cpus: vi.mocked(cpus),
	addCache: vi.mocked(addCache),
	removeCache: vi.mocked(removeCache),
	updateCache: vi.mocked(updateCache),
	getCache: vi.mocked(getCache),
	compile: vi.mocked(compile),
	getPieceSchemaFields: vi.mocked(getPieceFrontmatterSchemaFields),
	databaseValueToFrontmatterValue: vi.mocked(databaseValueToPieceFrontmatterValue),
	calculateHashFromFile: vi.mocked(calculateHashFromFile),
	makeInsertable: vi.mocked(makePieceItemInsertable),
	makeUpdatable: vi.mocked(makePieceItemUpdatable),
	initializePieceFrontMatter: vi.mocked(initializePieceFrontMatter),
	selectItems: vi.mocked(selectItems),
	deleteItems: vi.mocked(deleteItems),
	insertItem: vi.mocked(insertItem),
	updateItem: vi.mocked(updateItem),
	selectItem: vi.mocked(selectItem),
	addPiece: vi.mocked(addPiece),
	updatePiece: vi.mocked(updatePiece),
	getPiece: vi.mocked(getPiece),
	validatePieceItem: vi.mocked(validatePieceItem),
	getValidatePieceItemErrors: vi.mocked(getValidatePieceItemErrors),
	slugify: vi.mocked(slugify),
	makePieceValue: vi.mocked(makePieceValue),
	makePieceAttachment: vi.mocked(makePieceAttachment),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/pieces/piece.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('constructor throws', () => {
		const schema = makeSchema('not-title')
		const PieceType = makePieceMock()
		const markdown = makeMarkdownSample()
		const storage = mockStorage('root')

		mocks.initializePieceFrontMatter.mockReturnValueOnce(markdown.frontmatter)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)

		expect(() => new PieceType('books', storage, schema)).toThrow()
	})

	test('create', async () => {
		const PieceType = makePieceMock()
		const markdown = makeMarkdownSample()
		const storage = makeStorage('root')
		const title = markdown.frontmatter.title as string
		const file = markdown.filePath

		mocks.slugify.mockReturnValueOnce(title)
		mocks.initializePieceFrontMatter.mockReturnValueOnce(markdown.frontmatter)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(false)

		const piece = new PieceType('books', storage)
		const pieceMarkdown = await piece.create(file, title)

		expect(pieceMarkdown).toEqual(markdown)
	})

	test('create throws on existing piece', async () => {
		const PieceType = makePieceMock()
		const markdown = makeMarkdownSample()
		const storage = makeStorage('root')
		const title = markdown.frontmatter.title as string
		const file = markdown.filePath

		mocks.slugify.mockReturnValueOnce(title)
		mocks.initializePieceFrontMatter.mockReturnValueOnce(markdown.frontmatter)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(true)

		const piece = new PieceType('books', storage)
		const creating = piece.create(file, title)

		await expect(creating).rejects.toThrowError()
	})

	test('delete', async () => {
		const path = 'path/to/slug.md'
		const storage = makeStorage('root')
		const PieceTest = makePieceMock()
		const pieceTest = new PieceTest('books', storage)

		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(true)
		spies.delete = vi.spyOn(storage, 'delete').mockResolvedValueOnce()

		await pieceTest.delete(path)

		expect(spies.delete).toHaveBeenCalledOnce()
	})

	test('delete fails', async () => {
		const path = 'path/to/slug.md'
		const storage = makeStorage('root')
		const PieceTest = makePieceMock()
		const pieceTest = new PieceTest('books', storage)

		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(false)
		spies.delete = vi.spyOn(storage, 'delete').mockResolvedValueOnce()

		const deleting = pieceTest.delete(path)

		expect(deleting).rejects.toThrowError()
	})

	test('get schema', () => {
		const PieceType = makePieceMock()
		const type = 'table'
		const schema = makeSchema(type)
		const markdown = makeMarkdownSample()
		const storage = mockStorage('root')

		mocks.initializePieceFrontMatter.mockReturnValueOnce(markdown.frontmatter)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)

		const piece = new PieceType(type, storage, schema)

		expect(piece.schema).toEqual(schema)
	})

	test('isOutdated', async () => {
		const filename = '/path/to/slug.books.md'
		const db = mockDatabase().db
		const PieceType = makePieceMock()
		const cacheDate = new Date('11-11-2000').getTime()
		const fileDate = new Date('11-11-2001')
		const mockCache = makeCache({ date_updated: cacheDate })
		const storage = makeStorage('root')
		const pieceTest = new PieceType('books', storage)

		mocks.getCache.mockResolvedValueOnce(mockCache)
		spies.stat = vi
			.spyOn(storage, 'stat')
			.mockResolvedValueOnce({ last_modified: fileDate } as StorageStat)

		const isOutdated = await pieceTest.isOutdated(filename, db)

		expect(isOutdated).toEqual(true)
	})

	test('isOutdated by date_added', async () => {
		const filename = '/path/to/slug.books.md'
		const db = mockDatabase().db
		const PieceType = makePieceMock()
		const cacheDate = new Date('11-11-2000').getTime()
		const fileDate = new Date('11-11-2001')
		const mockCache = makeCache({ date_added: cacheDate, date_updated: undefined })
		const storage = makeStorage('root')
		const pieceTest = new PieceType('books', storage)

		mocks.getCache.mockResolvedValueOnce(mockCache)
		spies.stat = vi
			.spyOn(storage, 'stat')
			.mockResolvedValueOnce({ last_modified: fileDate } as StorageStat)

		const isOutdated = await pieceTest.isOutdated(filename, db)

		expect(isOutdated).toEqual(true)
	})

	test('isOutdated returns false', async () => {
		const filename = '/path/to/slug.books.md'
		const db = mockDatabase().db
		const PieceType = makePieceMock()
		const cacheDate = new Date('11-11-2000').getTime()
		const fileDate = new Date('11-11-2000')
		const mockCache = makeCache({ date_updated: cacheDate })
		const storage = makeStorage('root')
		const pieceTest = new PieceType('books', storage)

		mocks.getCache.mockResolvedValueOnce(mockCache)
		spies.stat = vi
			.spyOn(storage, 'stat')
			.mockResolvedValueOnce({ last_modified: fileDate } as StorageStat)

		const isOutdated = await pieceTest.isOutdated(filename, db)

		expect(isOutdated).toEqual(false)
	})

	test('isOutdated throws', async () => {
		const filename = '/path/to/slug.books.md'
		const db = mockDatabase().db
		const PieceType = makePieceMock()
		const storage = makeStorage('root')
		const pieceTest = new PieceType('books', storage)

		spies.stat = vi.spyOn(storage, 'stat').mockRejectedValueOnce(new Error('oof'))

		const isOutdating = pieceTest.isOutdated(filename, db)

		await expect(isOutdating).rejects.toThrow()
	})

	test('validate', () => {
		const PieceType = makePieceMock()
		const markdown = makeMarkdownSample()
		const piece = new PieceType()

		mocks.validatePieceItem.mockReturnValueOnce(true)

		const validate = piece.validate(markdown)

		expect(validate).toEqual({ isValid: true })
	})

	test('validate isFalse', () => {
		const PieceType = makePieceMock()
		const markdown = makeMarkdownSample()
		const piece = new PieceType()
		const errors = ['error']

		mocks.validatePieceItem.mockReturnValueOnce(false)
		mocks.getValidatePieceItemErrors.mockReturnValueOnce(errors)

		const validate = piece.validate(markdown)

		expect(validate).toEqual({ isValid: false, errors })
	})

	test('get', async () => {
		const note = 'note'
		const frontmatter = makeFrontmatterSample()
		const path = 'path/to/slug.md'
		const extracted = { markdown: note, frontmatter }
		const markdown = makeMarkdownSample({ note, frontmatter })
		const storage = makeStorage('root')
		const PieceTest = makePieceMock()
		const pieceTest = new PieceTest('books', storage)

		mocks.extract.mockResolvedValueOnce(
			extracted as Awaited<ReturnType<typeof extractFullMarkdown>>
		)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(true)
		spies.readFile = vi.spyOn(storage, 'readFile').mockResolvedValueOnce(note)

		const get = await pieceTest.get(path)

		expect(mocks.extract).toHaveBeenCalledWith(note)
		expect(mocks.makePieceMarkdown).toHaveBeenCalledOnce()
		expect(get).toEqual(markdown)
	})

	test('get throws', async () => {
		const note = 'note'
		const frontmatter = makeFrontmatterSample()
		const path = '/path/to/slug.md'
		const extracted = { markdown: note, frontmatter }
		const markdown = makeMarkdownSample({ note, frontmatter })
		const storage = makeStorage('root')
		const PieceTest = makePieceMock()
		const pieceTest = new PieceTest('books', storage)

		mocks.extract.mockResolvedValueOnce(
			extracted as Awaited<ReturnType<typeof extractFullMarkdown>>
		)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(false)

		const getting = pieceTest.get(path)

		await expect(getting).rejects.toThrowError()
	})

	test('write', async () => {
		const sample = makeMarkdownSample()
		const contents = JSON.stringify(sample.frontmatter)
		const storage = makeStorage('root')
		const PieceTest = makePieceMock()
		const pieceTest = new PieceTest('books', storage)

		mocks.validatePieceItem.mockReturnValueOnce(true)
		mocks.toMarkdownString.mockReturnValueOnce(contents)
		spies.write = vi.spyOn(storage, 'writeFile').mockResolvedValueOnce(undefined)

		await pieceTest.write(sample)

		expect(spies.write).toHaveBeenCalledWith(sample.filePath, contents)
	})

	test('write fails', async () => {
		const sample = makeMarkdownSample()
		const contents = JSON.stringify(sample.frontmatter)
		const storage = makeStorage('root')
		const PieceTest = makePieceMock()
		const pieceTest = new PieceTest('books', storage)

		mocks.validatePieceItem.mockReturnValueOnce(false)
		mocks.getValidatePieceItemErrors.mockReturnValueOnce(['error'])
		mocks.toMarkdownString.mockReturnValueOnce(contents)

		const writing = pieceTest.write(sample)

		await expect(writing).rejects.toThrowError()
	})

	test('prune', async () => {
		const dbPieces = [
			makePieceItemSelectable({ file_path: 'a' }),
			makePieceItemSelectable({ file_path: 'b' }),
			makePieceItemSelectable({ file_path: 'c' }),
		]
		const db = mockDatabase().db
		const storage = makeStorage('root')
		const PieceTest = makePieceMock()
		const pieceTest = new PieceTest('books', storage)

		mocks.selectItems.mockResolvedValueOnce(dbPieces)
		mocks.deleteItems.mockResolvedValueOnce()
		spies.delete = vi.spyOn(storage, 'delete').mockResolvedValue()

		await pieceTest.prune(db, [])

		expect(mocks.selectItems).toHaveBeenCalledOnce()
		expect(mocks.deleteItems).toHaveBeenCalledWith(
			db,
			dbPieces.map((piece) => piece.file_path)
		)
		expect(spies.delete).toHaveBeenCalledTimes(dbPieces.length)
	})

	test('prune no-op', async () => {
		const dbPieces = [
			makePieceItemSelectable(),
			makePieceItemSelectable(),
			makePieceItemSelectable({ file_path: 'c' }),
		]
		const files = dbPieces.map((piece) => piece.file_path)
		const PieceTest = makePieceMock()
		const db = mockDatabase().db

		const pieceTest = new PieceTest()
		mocks.selectItems.mockResolvedValueOnce(dbPieces)
		mocks.deleteItems.mockResolvedValueOnce()

		await pieceTest.prune(db, files, true)

		expect(mocks.selectItems).toHaveBeenCalledOnce()
		expect(mocks.deleteItems).not.toHaveBeenCalled()
	})

	test('syncMarkdownAdd', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()
		const hash = 'hash'

		const pieceTest = new PieceTest()
		mocks.makeInsertable.mockReturnValueOnce({} as LuzzleInsertable<'pieces_items'>)
		mocks.insertItem.mockResolvedValueOnce({} as LuzzleSelectable<'pieces_items'>)
		mocks.calculateHashFromFile.mockResolvedValueOnce(hash)

		await pieceTest.syncMarkdownAdd(dbMocks.db, markdown)

		expect(mocks.insertItem).toHaveBeenCalledOnce()
		expect(mocks.addCache).toHaveBeenCalledWith(dbMocks.db, markdown.filePath, hash)
	})

	test('syncMarkdownAdd supports dryRun', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePieceMock()
		const keywords = 'a,b'.split(',')
		const markdown = makeMarkdownSample({ frontmatter: { keywords: keywords.join(',') } })

		const pieceTest = new PieceTest()

		await pieceTest.syncMarkdownAdd(dbMocks.db, markdown, true)

		expect(dbMocks.queries.executeTakeFirst).not.toHaveBeenCalled()
	})

	test('syncMarkdownAdd catches error', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()

		mocks.insertItem.mockRejectedValueOnce(new Error('oof'))

		const pieceTest = new PieceTest()
		await pieceTest.syncMarkdownAdd(dbMocks.db, markdown)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncMarkdown update', async () => {
		const dbMocks = mockDatabase()
		const dbData = { id: 1, slug: 'slug' }
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()
		const pieceTest = new PieceTest()

		mocks.selectItem.mockResolvedValueOnce(dbData as unknown as LuzzleSelectable<'pieces_items'>)
		spies.syncUpdate = vi.spyOn(pieceTest, 'syncMarkdownUpdate').mockResolvedValueOnce()

		await pieceTest.syncMarkdown(dbMocks.db, markdown)

		expect(spies.syncUpdate).toHaveBeenCalledWith(dbMocks.db, markdown, dbData, false)
	})

	test('syncMarkdown add', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()
		const pieceTest = new PieceTest()

		mocks.selectItem.mockResolvedValueOnce(undefined)
		spies.syncAdd = vi.spyOn(pieceTest, 'syncMarkdownAdd').mockResolvedValueOnce()

		await pieceTest.syncMarkdown(dbMocks.db, markdown)

		expect(spies.syncAdd).toHaveBeenCalledWith(dbMocks.db, markdown, false)
	})

	test('syncMarkdownUpdate', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()
		const updated = { frontmatter_json: JSON.stringify(markdown.frontmatter), id: '1' }
		const pieceData = { ...makePieceItemSelectable() }

		const pieceTest = new PieceTest()
		mocks.makeUpdatable.mockReturnValueOnce(updated)
		mocks.updateItem.mockResolvedValueOnce()

		await pieceTest.syncMarkdownUpdate(dbMocks.db, markdown, pieceData)

		expect(mocks.updateItem).toHaveBeenCalledOnce()
	})

	test('syncMarkdownUpdate with keywords', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePieceMock()
		const keywords = 'a,b'.split(',')
		const markdown = makeMarkdownSample({ frontmatter: { keywords: keywords.join(',') } })
		const pieceData = { ...makePieceItemSelectable() }
		const updated = { frontmatter_json: JSON.stringify(markdown.frontmatter) }

		const pieceTest = new PieceTest()
		mocks.makeUpdatable.mockReturnValueOnce(updated)
		mocks.updateItem.mockResolvedValueOnce()

		await pieceTest.syncMarkdownUpdate(dbMocks.db, markdown, pieceData)

		expect(mocks.updateItem).toHaveBeenCalledOnce()
	})

	test('syncMarkdownUpdate catches error', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()
		const pieceData = makePieceItemSelectable()
		const updated = { frontmatter_json: JSON.stringify(markdown.frontmatter) }

		const pieceTest = new PieceTest()
		mocks.makeUpdatable.mockReturnValueOnce(updated)
		mocks.updateItem.mockRejectedValueOnce(new Error('oof'))

		await pieceTest.syncMarkdownUpdate(dbMocks.db, markdown, pieceData)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncMarkdownUpdate supports dryRun', async () => {
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()
		const pieceData = makePieceItemSelectable()
		const db = mockDatabase().db
		const updated = { frontmatter_json: JSON.stringify(markdown.frontmatter) }

		const pieceTest = new PieceTest()
		mocks.makeUpdatable.mockReturnValueOnce(updated)

		await pieceTest.syncMarkdownUpdate(db, markdown, pieceData, true)
	})

	test('toMarkdown', () => {
		const pieceMarkdown = makeMarkdownSample()
		const pieceSample = makePieceItemSelectable()
		const PieceTest = makePieceMock()

		mocks.makePieceMarkdown.mockReturnValueOnce(pieceMarkdown)
		mocks.getPieceSchemaFields.mockReturnValueOnce([
			{ name: 'title', type: 'string', format: 'asset' },
		])
		mocks.databaseValueToFrontmatterValue.mockReturnValueOnce(pieceMarkdown.frontmatter.title)

		const markdown = new PieceTest().toMarkdown(pieceSample)

		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			pieceMarkdown.filePath,
			pieceMarkdown.piece,
			pieceMarkdown.note,
			pieceMarkdown.frontmatter
		)
		expect(markdown).toEqual(pieceMarkdown)
	})

	test('toMarkdown with arrays', () => {
		const pieceMarkdown = makeMarkdownSample()
		const pieceSample = makePieceItemSelectable()
		const PieceTest = makePieceMock()
		const title = ['a', 'b']

		pieceSample.frontmatter_json = JSON.stringify({ title })
		pieceMarkdown.frontmatter = JSON.parse(pieceSample.frontmatter_json)

		mocks.makePieceMarkdown.mockReturnValueOnce(pieceMarkdown)
		mocks.getPieceSchemaFields.mockReturnValueOnce([
			{ name: 'title', type: 'array', items: { type: 'string' } },
		])
		mocks.databaseValueToFrontmatterValue.mockReturnValueOnce(title)

		const markdown = new PieceTest().toMarkdown(pieceSample)

		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			pieceMarkdown.filePath,
			pieceMarkdown.piece,
			pieceMarkdown.note,
			pieceMarkdown.frontmatter
		)
		expect(markdown).toEqual(pieceMarkdown)
	})

	test('sync', async () => {
		const dbMocks = mockDatabase()
		const slugs = ['a', 'b']
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()

		const pieceTest = new PieceTest()
		mocks.cpus.mockReturnValue([{} as CpuInfo])

		spies.get = vi.spyOn(pieceTest, 'get').mockResolvedValueOnce(markdown)
		spies.syncMarkdown = vi.spyOn(pieceTest, 'syncMarkdown').mockResolvedValue()

		await pieceTest.sync(dbMocks.db, slugs)

		expect(spies.syncMarkdown).toHaveBeenCalledWith(dbMocks.db, markdown, false)
	})

	test('setFields', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title'
		const value = 'new title'
		const fields = [{ name: field, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementation(async (_, value) => value as string)

		await pieceTest.setFields(markdown, { [field]: value })

		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			{ ...markdown.frontmatter, [field]: value }
		)
	})

	test('setField', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title'
		const value = 'new title'
		const fields = [{ name: field, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementation(async (_, value) => value as string)

		await pieceTest.setField(markdown, field, value)
		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			{ ...markdown.frontmatter, [field]: value }
		)
	})

	test('setField throws on bad field', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title'
		const value = 'new title'
		const fields = [{ name: 'title2', type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)

		const updating = pieceTest.setField(markdown, field, value)

		await expect(updating).rejects.toThrowError()
	})

	test('setField resets array types with scalar', async () => {
		const tags = ['tag1', 'tag2']
		const markdown = makeMarkdownSample({ frontmatter: { tags } })
		const field = 'tags'
		const value = 'another-tag'
		const fields = [
			{ name: field, type: 'array', items: { type: 'string' } },
		] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementation(async (_, value) => value as string)

		await pieceTest.setField(markdown, field, value)

		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			{ ...markdown.frontmatter, [field]: [value] }
		)
	})

	test('setField resets array types with another array', async () => {
		const tags = ['tag1', 'tag2']
		const markdown = makeMarkdownSample({ frontmatter: { tags } })
		const field = 'tags'
		const value = 'another-tag'
		const fields = [
			{ name: field, type: 'array', items: { type: 'string' } },
		] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementation(async (_, value) => value as string)

		await pieceTest.setField(markdown, field, [...tags, value])

		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			{ ...markdown.frontmatter, [field]: [...tags, value] }
		)
	})

	test('setField with attachment', async () => {
		const mockReadable = new PassThrough() as unknown as Readable
		const markdown = makeMarkdownSample()
		const field = 'cover'
		const value = 'file'
		const finalValue = 'path/to/file.jpg'
		const fields = [
			{ name: field, type: 'string', format: 'asset' },
		] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()
		const storage = makeStorage('root')
		const pieceTest = new PieceTest('books', storage)

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementationOnce(async () => mockReadable)
		mocks.makePieceAttachment.mockResolvedValueOnce(finalValue)

		await pieceTest.setField(markdown, field, value)

		expect(mocks.makePieceAttachment).toHaveBeenCalledOnce()
		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			{
				...markdown.frontmatter,
				[field]: finalValue,
			}
		)
	})

	test('setField with bad attachment', async () => {
		const mockReadable = new PassThrough() as unknown as Readable
		const markdown = makeMarkdownSample()
		const field = 'cover'
		const value = 'file'
		const fields = [
			{ name: field, type: 'string', format: 'asset' },
		] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()
		const storage = makeStorage('root')
		const pieceTest = new PieceTest('books', storage)

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceValue.mockImplementationOnce(async () => mockReadable)
		mocks.makePieceAttachment.mockRejectedValueOnce(new Error('oof'))

		const newMarkdown = await pieceTest.setField(markdown, field, value)

		expect(mocks.makePieceAttachment).toHaveBeenCalledOnce()
		// Assert that the original markdown is returned and makePieceMarkdown is NOT called to create a new one.
		expect(newMarkdown).toEqual(markdown)
		expect(mocks.makePieceMarkdown).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalledWith('could not set field cover: oof')
	})

	test('removeFields', async () => {
		const markdown = makeMarkdownSample({ frontmatter: { title: 'title', subtitle: 'sub' } })
		const field = 'subtitle'
		const fields = [
			{ name: field, type: 'string', nullable: true },
		] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementationOnce(async (_, value) => value as string)

		await pieceTest.removeFields(markdown, [field])

		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			{
				...markdown.frontmatter,
				[field]: undefined,
			}
		)
	})

	test('removeField', async () => {
		const markdown = makeMarkdownSample({ frontmatter: { title: 'title', subtitle: 'sub' } })
		const field = 'subtitle'
		const fields = [
			{ name: field, type: 'string', nullable: true },
		] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementationOnce(async (_, value) => value as string)

		await pieceTest.removeField(markdown, field)

		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			{
				...markdown.frontmatter,
				[field]: undefined,
			}
		)
	})

	test('removeField throws on bad field', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title2'
		const fields = [{ name: 'title', type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)

		const updating = pieceTest.removeField(markdown, field)

		await expect(updating).rejects.toThrowError()
	})

	test('removeField throws on required field', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title'
		const fields = [{ name: field, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)

		const updating = pieceTest.removeField(markdown, field)

		await expect(updating).rejects.toThrowError()
	})

	test('removeField with desired value', async () => {
		const value = 'sub'
		const markdown = makeMarkdownSample({ frontmatter: { title: 'title', subtitle: value } })
		const field = 'subtitle'
		const fields = [
			{ name: field, type: 'string', nullable: true },
		] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementationOnce(async (_, value) => value as string)

		await pieceTest.removeField(markdown, field, value)

		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			{
				...markdown.frontmatter,
				[field]: undefined,
			}
		)
	})

	test('removeField with non-existant value', async () => {
		const value = 'sub'
		const markdown = makeMarkdownSample({ frontmatter: { title: 'title', subtitle: value } })
		const field = 'subtitle'
		const fields = [
			{ name: field, type: 'string', nullable: true },
		] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementationOnce(async (_, value) => value as string)

		const result = await pieceTest.removeField(markdown, field, 'random')

		expect(result).toEqual(markdown)
	})

	test('removeField one value from array field', async () => {
		const values = ['one', 'two', 'three']
		const markdown = makeMarkdownSample({ frontmatter: { title: 'title', subtitle: values } })
		const field = 'subtitle'
		const fields = [
			{ name: field, type: 'array', nullable: true, items: { type: 'string' } },
		] as Array<PieceFrontmatterSchemaField>
		const PieceTest = makePieceMock()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce(fields)
		mocks.makePieceMarkdown.mockReturnValueOnce(markdown)
		mocks.makePieceValue.mockImplementationOnce(async (_, value) => value)

		await pieceTest.removeField(markdown, field, 'two')

		expect(mocks.makePieceMarkdown).toHaveBeenCalledWith(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			{
				...markdown.frontmatter,
				[field]: ['one', 'three'],
			}
		)
	})
})
