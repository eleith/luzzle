import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { readdir, stat, writeFile, copyFile, unlink, mkdir } from 'fs/promises'
import { Dirent, existsSync, mkdirSync, Stats } from 'fs'
import {
	makeSchema,
	makeCacheSchema,
	makeMarkdownSample,
	makeSample,
	makeValidator,
	makePiece,
	makeFrontmatterSample,
} from './piece.fixtures.js'
import { toMarkdown, toValidatedMarkdown, toMarkdownString } from './markdown.js'
import { extract } from '../md.js'
import { mockDatabase } from '../database.mock.js'
import { removeAllTagsFrom, addTagsTo, keywordsToTags, syncTagsFor } from '../tags/index.js'
import log from '../log.js'
import { CpuInfo, cpus } from 'os'
import CacheForType from '../cache.js'
import { fileTypeFromFile, FileTypeResult } from 'file-type'
import {
	Pieces,
	ajv,
	getFrontmatterFieldSchemas,
	getDatabaseFieldSchemas,
	frontmatterToDatabaseValue,
	databaseToFrontmatterValue,
	PieceInsertable,
} from '@luzzle/kysely'

vi.mock('fs')
vi.mock('fs/promises')
vi.mock('../log')
vi.mock('../md')
vi.mock('./markdown')
vi.mock('../tags/index')
vi.mock('../cache')
vi.mock('os')
vi.mock('file-type')
vi.mock('@luzzle/kysely')

const mocks = {
	existsSync: vi.mocked(existsSync),
	mkdirSync: vi.mocked(mkdirSync),
	mkdir: vi.mocked(mkdir),
	readdir: vi.mocked(readdir),
	writeFile: vi.mocked(writeFile),
	toValidateMarkdown: vi.mocked(toValidatedMarkdown),
	toMarkdown: vi.mocked(toMarkdown),
	toMarkdownString: vi.mocked(toMarkdownString),
	removeAllTagsFrom: vi.mocked(removeAllTagsFrom),
	addTagsTo: vi.mocked(addTagsTo),
	keywordsToTags: vi.mocked(keywordsToTags),
	syncTagsFor: vi.mocked(syncTagsFor),
	extract: vi.mocked(extract),
	logError: vi.mocked(log.error),
	stat: vi.mocked(stat),
	cpus: vi.mocked(cpus),
	CacheGet: vi.spyOn(CacheForType.prototype, 'get'),
	CacheUpdate: vi.spyOn(CacheForType.prototype, 'update'),
	CacheGetAllFiles: vi.spyOn(CacheForType.prototype, 'getAllFiles'),
	CacheRemove: vi.spyOn(CacheForType.prototype, 'remove'),
	compile: vi.mocked(ajv),
	copy: vi.mocked(copyFile),
	fileType: vi.mocked(fileTypeFromFile),
	unlink: vi.mocked(unlink),
	getFrontmatterFieldSchemas: vi.mocked(getFrontmatterFieldSchemas),
	getDatabaseFieldSchemas: vi.mocked(getDatabaseFieldSchemas),
	frontmatterToDatabaseValue: vi.mocked(frontmatterToDatabaseValue),
	databaseToFrontmatterValue: vi.mocked(databaseToFrontmatterValue),
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

	test('initialize', () => {
		const PieceType = makePiece()

		mocks.mkdirSync.mockReturnValue(undefined)
		mocks.existsSync.mockReturnValueOnce(true)
		mocks.existsSync.mockReturnValue(false)

		const piece = new PieceType()
		piece.initialize()

		expect(mocks.mkdirSync).toHaveBeenCalledTimes(2)
	})

	test('getFileName', () => {
		const slug = 'slug'
		const PieceType = makePiece()

		const filename = new PieceType().getFileName(slug)

		expect(filename).toEqual(`${slug}.md`)
	})

	test('getPath', () => {
		const slug = 'slug'
		const filename = 'filename'
		const PieceType = makePiece()

		const pieceTest = new PieceType()
		spies.getFileName = vi.spyOn(pieceTest, 'getFileName').mockReturnValue(filename)

		const getPath = pieceTest.getPath(slug)

		expect(getPath).toMatch(new RegExp(`${filename}$`))
		expect(spies.getFileName).toHaveBeenCalledWith(slug)
	})

	test('toCreateInput', () => {
		const PieceType = makePiece()
		const slug = 'slug'
		const note = 'note'
		const frontmatter = {
			title: 'title',
			author: 'author',
			hidden: 'hidden',
		}
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const pieceTest = new PieceType()

		mocks.getFrontmatterFieldSchemas.mockReturnValueOnce([
			{ name: 'title', type: 'string' },
			{ name: 'author', type: 'string' },
			{ name: 'hidden', type: 'string' },
		])
		mocks.getDatabaseFieldSchemas.mockReturnValueOnce([
			{ name: 'title', type: 'string' },
			{ name: 'author', type: 'string' },
		])
		mocks.frontmatterToDatabaseValue.mockImplementation((value) => value)

		const input = pieceTest.toCreateInput(markdown)

		expect(input).toEqual({
			id: expect.any(String),
			slug: markdown.slug,
			note: markdown.note,
			title: frontmatter.title,
			author: frontmatter.author,
		})
	})

	test('toUpdateInput', () => {
		const PieceType = makePiece()
		const data = makeSample()
		const frontmatter = {
			...data,
			id: undefined,
			slug: undefined,
			note: undefined,
			title: 'title2',
		}
		const markdown = makeMarkdownSample(data.slug, data.note, frontmatter)
		const pieceTest = new PieceType()

		mocks.getFrontmatterFieldSchemas.mockReturnValueOnce([
			{ name: 'title', type: 'string' },
			{ name: 'author', type: 'string' },
			{ name: 'hidden', type: 'string' },
		])
		mocks.getDatabaseFieldSchemas.mockReturnValueOnce([
			{ name: 'title', type: 'string' },
			{ name: 'author', type: 'string' },
		])
		mocks.frontmatterToDatabaseValue.mockImplementation((value) => value)

		const input = pieceTest.toUpdateInput(markdown, data)

		expect(input).toEqual({
			title: frontmatter.title,
			date_updated: expect.any(Number),
		})
	})

	test('toUpdateInput', () => {
		const PieceType = makePiece()
		const data = makeSample()
		const slug = 'slug2'
		const note = 'note2'
		const frontmatter = {
			...data,
			id: undefined,
			slug: undefined,
			note: undefined,
		}
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const pieceTest = new PieceType()

		mocks.getFrontmatterFieldSchemas.mockReturnValueOnce([
			{ name: 'title', type: 'string' },
			{ name: 'author', type: 'string' },
		])
		mocks.getDatabaseFieldSchemas.mockReturnValueOnce([
			{ name: 'title', type: 'string' },
			{ name: 'author', type: 'string' },
		])
		mocks.frontmatterToDatabaseValue.mockImplementation((value) => value)

		const input = pieceTest.toUpdateInput(markdown, data)

		expect(input).toEqual({
			slug,
			note,
			date_updated: expect.any(Number),
		})
	})

	test('getSlugs', async () => {
		const slugs = ['1984', '1q84']
		const files = slugs.map((slug) => `/luzzle/items/${slug}.md`)
		const dirent = files.map((file) => ({ isFile: () => true, name: file })) as Dirent[]
		const PieceTest = makePiece()

		mocks.readdir.mockResolvedValue(dirent)

		const foundSlugs = await new PieceTest().getSlugs()

		expect(foundSlugs).toEqual(slugs)
	})

	test('filterSlugsBy', async () => {
		const pieceSchema = makeSchema()
		const pieceCacheSchema = makeCacheSchema()
		const type = 'lastProcessed'
		const PieceTest = makePiece()
		const slugs = ['a', 'b', 'c']
		const fileUpdated = new Date('2201-11-11')
		const cacheUpdated = new Date('2101-11-11')
		const pieceDir = 'piece-dir'
		const pieceTable = 'table' as Pieces

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockResolvedValue({ mtime: fileUpdated } as Stats)
		mocks.CacheGet.mockResolvedValue({ lastProcessed: cacheUpdated.toUTCString() })

		const pieceTest = new PieceTest(pieceDir, pieceTable, pieceSchema, pieceCacheSchema)

		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue('somewhere/slug')

		const updatedSlugs = await pieceTest.filterSlugsBy(slugs, type)

		expect(updatedSlugs).toEqual(slugs)
	})

	test('filterSlugsBy filters untouched files', async () => {
		const pieceSchema = makeSchema()
		const pieceCacheSchema = makeCacheSchema()
		const type = 'lastProcessed'
		const PieceTest = makePiece()
		const slugs = ['a', 'b', 'c']
		const fileUpdated = new Date('2001-11-11')
		const cacheUpdated = new Date('2101-11-11')
		const pieceDir = 'piece-dir'
		const pieceTable = 'table' as Pieces

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockResolvedValue({ mtime: fileUpdated } as Stats)
		mocks.CacheGet.mockResolvedValue({ lastProcessed: cacheUpdated.toUTCString() })

		const pieceTest = new PieceTest(pieceDir, pieceTable, pieceSchema, pieceCacheSchema)

		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue('somewhere/slug')

		const updatedSlugs = await pieceTest.filterSlugsBy(slugs, type)

		expect(updatedSlugs).toEqual([])
	})

	test('filterSlugsBy filters in new files', async () => {
		const slugs = ['a', 'b', 'c']
		const fileUpdated = new Date('2001-11-11')
		const type = 'lastProcessed'
		const PieceTest = makePiece()

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockResolvedValue({ mtime: fileUpdated } as Stats)
		mocks.CacheGet.mockResolvedValue({})

		const pieceTest = new PieceTest()

		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue('somewhere/slug')

		const updatedSlugs = await pieceTest.filterSlugsBy(slugs, type)

		expect(updatedSlugs).toEqual(slugs)
	})

	test('filterSlugsBy filters non-existant files', async () => {
		const slugs = ['a', 'b', 'c']
		const type = 'lastProcessed'
		const PieceTest = makePiece()

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockRejectedValue(new Error('no file'))
		mocks.CacheGet.mockResolvedValue({})

		const pieceTest = new PieceTest()

		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue('somewhere/slug')

		const updatedSlugs = await pieceTest.filterSlugsBy(slugs, type)

		expect(updatedSlugs).toEqual([])
	})

	test('exists', () => {
		const slug = 'slug'
		const PieceTest = makePiece()

		mocks.existsSync.mockReturnValueOnce(true)

		const pieceTest = new PieceTest()

		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue('somewhere/slug')

		pieceTest.exists(slug)

		expect(spies.getPath).toHaveBeenCalledWith(slug)
		expect(mocks.existsSync).toHaveBeenCalledOnce()
	})

	test('get', async () => {
		const slug = 'slug'
		const note = 'note'
		const frontmatter = makeFrontmatterSample()
		const path = '/path/to/slug.md'
		const extracted = { markdown: note, frontmatter }
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const PieceTest = makePiece()

		mocks.extract.mockResolvedValueOnce(extracted as Awaited<ReturnType<typeof extract>>)
		mocks.toValidateMarkdown.mockReturnValueOnce(markdown)

		const pieceTest = new PieceTest()
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue(path)
		spies.exists = vi.spyOn(pieceTest, 'exists').mockReturnValue(true)

		const get = await pieceTest.get(slug)

		expect(extract).toHaveBeenCalledWith(path)
		expect(mocks.toValidateMarkdown).toHaveBeenCalledOnce()
		expect(get).toEqual(markdown)
	})

	test('get without validation', async () => {
		const slug = 'slug'
		const note = 'note'
		const frontmatter = makeFrontmatterSample()
		const path = '/path/to/slug.md'
		const extracted = { markdown: note, frontmatter }
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const PieceTest = makePiece()

		mocks.extract.mockResolvedValueOnce(extracted as Awaited<ReturnType<typeof extract>>)
		mocks.toMarkdown.mockReturnValueOnce(markdown)

		const pieceTest = new PieceTest()
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue(path)
		spies.exists = vi.spyOn(pieceTest, 'exists').mockReturnValue(true)

		const get = await pieceTest.get(slug, false)

		expect(extract).toHaveBeenCalledWith(path)
		expect(mocks.toMarkdown).toHaveBeenCalledOnce()
		expect(get).toEqual(markdown)
	})

	test('get returns null', async () => {
		const slug = 'slug'
		const path = '/path/to/slug.md'
		const note = 'note'
		const frontmatter = makeFrontmatterSample()
		const extracted = { markdown: note, frontmatter }
		const markdown = makeMarkdownSample(slug, note, frontmatter)
		const PieceTest = makePiece()

		mocks.extract.mockResolvedValueOnce(extracted as Awaited<ReturnType<typeof extract>>)
		mocks.toValidateMarkdown.mockReturnValueOnce(markdown)

		const pieceTest = new PieceTest()
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue(path)
		spies.exists = vi.spyOn(pieceTest, 'exists').mockReturnValue(false)

		const get = await pieceTest.get(slug)

		expect(get).toEqual(null)
	})

	test('write', async () => {
		const sample = makeMarkdownSample()
		const PieceTest = makePiece()

		spies.cacheUpdate = vi.fn(async () => '')
		mocks.toMarkdownString.mockReturnValueOnce('')
		mocks.writeFile.mockResolvedValueOnce(undefined)

		await new PieceTest().write(sample)

		expect(mocks.writeFile).toHaveBeenCalledOnce()
		expect(mocks.CacheUpdate).toHaveBeenCalledOnce()
	})

	test('cleanUpCache', async () => {
		const slugs = ['a', 'b', 'c']
		const PieceTest = makePiece()

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.CacheGetAllFiles.mockResolvedValue(slugs)
		mocks.getFrontmatterFieldSchemas.mockReturnValue([])

		const pieceTest = new PieceTest()

		const removed = await pieceTest.cleanUpCache([])

		expect(removed).toEqual(slugs)
		expect(mocks.CacheRemove).toHaveBeenCalledTimes(slugs.length)
	})

	test('cleanUpCache removes attachments', async () => {
		const slugs = ['a']
		const PieceTest = makePiece()
		const mediaFolder = 'cover'

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.CacheGetAllFiles.mockResolvedValue(slugs)
		mocks.CacheGet.mockResolvedValueOnce({ database: { [mediaFolder]: 'path/to/cover.jpg' } })
		mocks.getFrontmatterFieldSchemas.mockReturnValue([
			{ name: mediaFolder, type: 'string', format: 'attachment' },
		])
		mocks.unlink.mockResolvedValueOnce()

		const pieceTest = new PieceTest('root', 'table' as Pieces)

		const removed = await pieceTest.cleanUpCache([])

		expect(removed).toEqual(slugs)
		expect(mocks.CacheRemove).toHaveBeenCalledTimes(slugs.length)
		expect(mocks.unlink).toHaveBeenCalledOnce()
		expect(mocks.CacheGet).toHaveBeenCalledOnce()
	})

	test('cleanUpCache fails removing attachments', async () => {
		const slugs = ['a']
		const PieceTest = makePiece()
		const mediaFolder = 'cover'
		const schema = makeSchema({
			cover: { type: 'string', metadata: { luzzleFormat: 'attachment' } },
		})

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.CacheGetAllFiles.mockResolvedValue(slugs)
		mocks.CacheGet.mockResolvedValueOnce({ database: { [mediaFolder]: 'path/to/cover.jpg' } })
		mocks.getFrontmatterFieldSchemas.mockReturnValue([
			{ name: mediaFolder, type: 'string', format: 'attachment' },
		])
		mocks.unlink.mockRejectedValueOnce(new Error('oof'))

		const pieceTest = new PieceTest('root', 'table' as Pieces, schema)

		const removed = await pieceTest.cleanUpCache([])

		expect(removed).toEqual(slugs)
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('cleanUpSlugs', async () => {
		const dbMocks = mockDatabase()
		const slugs = ['a', 'b', 'c']
		const slugsOnDisk = ['a', 'b']
		const PieceTest = makePiece()

		dbMocks.queries.execute.mockResolvedValueOnce(slugs.map((slug, id) => ({ id, slug })))

		await new PieceTest().cleanUpSlugs(dbMocks.db, slugsOnDisk)

		expect(mocks.removeAllTagsFrom).toHaveBeenCalledWith(dbMocks.db, [2], expect.any(String))
	})

	test('cleanUpSlugs supports dryRun', async () => {
		const dbMocks = mockDatabase()
		const slugs = ['a', 'b', 'c']
		const slugsOnDisk = ['a', 'b']
		const PieceTest = makePiece()

		dbMocks.queries.execute.mockResolvedValueOnce(slugs.map((slug, id) => ({ id, slug })))

		await new PieceTest().cleanUpSlugs(dbMocks.db, slugsOnDisk, true)

		expect(dbMocks.queries.execute).toHaveBeenCalledOnce()
		expect(mocks.removeAllTagsFrom).not.toHaveBeenCalled()
	})

	test('cleanUpSlugs catches error', async () => {
		const dbMocks = mockDatabase()
		const slugsOnDisk = ['a', 'b']
		const PieceTest = makePiece()

		dbMocks.queries.execute.mockResolvedValueOnce(slugsOnDisk)
		dbMocks.queries.execute.mockRejectedValueOnce(new Error('oof'))

		await new PieceTest().cleanUpSlugs(dbMocks.db, slugsOnDisk)

		expect(mocks.removeAllTagsFrom).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncCleanUp', async () => {
		const dbMocks = mockDatabase()
		const slugs = ['a', 'b', 'c']
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()
		spies.cleanUpCache = vi.spyOn(pieceTest, 'cleanUpCache').mockResolvedValueOnce(slugs)
		spies.cleanUpSlugs = vi.spyOn(pieceTest, 'cleanUpSlugs').mockResolvedValueOnce()
		spies.getSlugs = vi.spyOn(pieceTest, 'getSlugs').mockResolvedValueOnce(slugs)

		await pieceTest.syncCleanUp(dbMocks.db)

		expect(spies.cleanUpCache).toHaveBeenCalledOnce()
		expect(spies.cleanUpSlugs).toHaveBeenCalledOnce()
	})

	test('syncAdd', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const added = { ...markdown.frontmatter, id: 1 }

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()
		spies.createInput = vi
			.spyOn(pieceTest, 'toCreateInput')
			.mockReturnValueOnce({} as PieceInsertable)
		dbMocks.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(added)

		await pieceTest.syncAdd(dbMocks.db, markdown)

		expect(dbMocks.queries.executeTakeFirstOrThrow).toHaveBeenCalledOnce()
		expect(spies.markAsSynced).toHaveBeenCalledWith(added)
		expect(mocks.addTagsTo).not.toHaveBeenCalled()
	})

	test('syncAdd with keywords', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const keywords = 'a,b'.split(',')
		const markdown = makeMarkdownSample('slug', 'note', { keywords: keywords.join(',') })
		const added = { ...markdown.frontmatter, id: 1 }

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()
		spies.createInput = vi
			.spyOn(pieceTest, 'toCreateInput')
			.mockReturnValueOnce({} as PieceInsertable)
		dbMocks.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(added)
		mocks.keywordsToTags.mockReturnValueOnce(keywords)

		await pieceTest.syncAdd(dbMocks.db, markdown)

		expect(dbMocks.queries.executeTakeFirstOrThrow).toHaveBeenCalledOnce()
		expect(spies.markAsSynced).toHaveBeenCalledWith(added)
		expect(mocks.addTagsTo).toHaveBeenCalledWith(dbMocks.db, keywords, added.id, expect.any(String))
	})

	test('syncAdd supports dryRun', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const keywords = 'a,b'.split(',')
		const markdown = makeMarkdownSample('slug', 'note', { keywords: keywords.join(',') })

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()

		await pieceTest.syncAdd(dbMocks.db, markdown, true)

		expect(dbMocks.queries.executeTakeFirstOrThrow).not.toHaveBeenCalled()
		expect(spies.markAsSynced).not.toHaveBeenCalled()
		expect(mocks.addTagsTo).not.toHaveBeenCalled()
	})

	test('syncAdd catches error', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		dbMocks.queries.executeTakeFirstOrThrow.mockRejectedValueOnce(new Error('oof'))

		const pieceTest = new PieceTest()
		await pieceTest.syncAdd(dbMocks.db, markdown)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncMarkdown update', async () => {
		const dbMocks = mockDatabase()
		const dbData = { id: 1, slug: 'slug' }
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		dbMocks.queries.executeTakeFirst.mockResolvedValueOnce(dbData)

		const pieceTest = new PieceTest()
		spies.syncUpdate = vi.spyOn(pieceTest, 'syncUpdate').mockResolvedValueOnce()

		await pieceTest.syncMarkdown(dbMocks.db, markdown)

		expect(spies.syncUpdate).toHaveBeenCalledWith(dbMocks.db, markdown, dbData, false)
	})

	test('syncMarkdown add', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		dbMocks.queries.executeTakeFirst.mockResolvedValueOnce(null)

		const pieceTest = new PieceTest()
		spies.syncAdd = vi.spyOn(pieceTest, 'syncAdd').mockResolvedValueOnce()

		await pieceTest.syncMarkdown(dbMocks.db, markdown)

		expect(spies.syncAdd).toHaveBeenCalledWith(dbMocks.db, markdown, false)
	})

	test('syncUpdate', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const updated = { ...markdown.frontmatter, id: 'asdf' }
		const pieceData = makeSample()

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()
		spies.toUpdateInput = vi.spyOn(pieceTest, 'toUpdateInput').mockResolvedValueOnce(updated)
		dbMocks.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(updated)
		mocks.keywordsToTags.mockReturnValueOnce([])

		await pieceTest.syncUpdate(dbMocks.db, markdown, pieceData)

		expect(dbMocks.queries.executeTakeFirstOrThrow).toHaveBeenCalledOnce()
		expect(spies.markAsSynced).toHaveBeenCalledWith(updated)
		expect(mocks.syncTagsFor).toHaveBeenCalledWith(dbMocks.db, [], updated.id, expect.any(String))
	})

	test('syncUpdate with keywords', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const keywords = 'a,b'.split(',')
		const markdown = makeMarkdownSample('slug', 'note', { keywords: keywords.join(',') })
		const pieceData = makeSample()
		const updated = { ...markdown.frontmatter, keywords: 'a' }
		const dbUpdate = { ...updated, id: 1 }

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()
		spies.toUpdateInput = vi.spyOn(pieceTest, 'toUpdateInput').mockResolvedValueOnce(updated)
		dbMocks.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(dbUpdate)
		mocks.keywordsToTags.mockReturnValueOnce(keywords)

		await pieceTest.syncUpdate(dbMocks.db, markdown, pieceData)

		expect(dbMocks.queries.executeTakeFirstOrThrow).toHaveBeenCalledOnce()
		expect(spies.markAsSynced).toHaveBeenCalledWith(dbUpdate)
		expect(mocks.syncTagsFor).toHaveBeenCalledWith(
			dbMocks.db,
			keywords,
			dbUpdate.id,
			expect.any(String)
		)
	})

	test('syncUpdate catches error', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const pieceData = makeSample()
		const updated = { ...markdown.frontmatter, keywords: 'a' }

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()
		spies.toUpdateInput = vi.spyOn(pieceTest, 'toUpdateInput').mockResolvedValueOnce(updated)
		dbMocks.queries.executeTakeFirstOrThrow.mockRejectedValueOnce(new Error('oof'))

		await pieceTest.syncUpdate(dbMocks.db, markdown, pieceData)

		expect(spies.markAsSynced).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncUpdate supports dryRun', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const pieceData = makeSample()
		const updated = { ...markdown.frontmatter, keywords: 'a' }

		const pieceTest = new PieceTest()
		spies.toUpdateInput = vi.spyOn(pieceTest, 'toUpdateInput').mockResolvedValueOnce(updated)
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()

		await pieceTest.syncUpdate(dbMocks.db, markdown, pieceData, true)

		expect(spies.markAsSynced).not.toHaveBeenCalled()
	})

	test('toMarkdown', () => {
		const pieceValidator = makeValidator()
		const pieceMarkdown = makeMarkdownSample()
		const pieceSample = makeSample()
		const PieceTest = makePiece()

		mocks.toValidateMarkdown.mockReturnValueOnce(pieceMarkdown)
		mocks.getFrontmatterFieldSchemas.mockReturnValueOnce([{ name: 'title', type: 'string' }])
		mocks.databaseToFrontmatterValue.mockReturnValueOnce(pieceMarkdown.frontmatter.title)
		mocks.compile.mockReturnValueOnce(pieceValidator)

		const markdown = new PieceTest('dir', 'table' as Pieces).toMarkdown(pieceSample)

		expect(mocks.toValidateMarkdown).toHaveBeenCalledWith(
			pieceMarkdown.slug,
			pieceMarkdown.note,
			pieceMarkdown.frontmatter,
			pieceValidator
		)
		expect(markdown).toEqual(pieceMarkdown)
	})

	test('markAsSynced', async () => {
		const pieceSample = makeSample()
		const PieceTest = makePiece()

		await new PieceTest().markAsSynced(pieceSample)

		expect(mocks.CacheUpdate).toHaveBeenCalledOnce()
	})

	test('sync', async () => {
		const dbMocks = mockDatabase()
		const slugs = ['a', 'b']
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		const pieceTest = new PieceTest()
		spies.get = vi.spyOn(pieceTest, 'get').mockResolvedValueOnce(markdown)
		spies.get = vi.spyOn(pieceTest, 'get').mockResolvedValueOnce(null)
		spies.syncMarkdown = vi.spyOn(pieceTest, 'syncMarkdown').mockResolvedValue()

		await pieceTest.sync(dbMocks.db, slugs)

		expect(spies.syncMarkdown).toHaveBeenCalledOnce()
		expect(spies.syncMarkdown).toHaveBeenCalledWith(dbMocks.db, markdown, false)
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('attach', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const mediaField = 'cover'
		const root = 'root'
		const table = 'table' as Pieces
		const relPath = `.assets/${mediaField}/${markdown.slug}.jpg`
		const toPath = `${root}/${table}/${relPath}`
		const updatedMarkdown = makeMarkdownSample('slug', 'note', {
			...markdown.frontmatter,
			[mediaField]: relPath,
		})

		const pieceTest = new PieceTest(root, table)

		mocks.fileType.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.copy.mockResolvedValueOnce()
		mocks.toValidateMarkdown.mockReturnValueOnce(updatedMarkdown)
		mocks.getFrontmatterFieldSchemas.mockReturnValueOnce([
			{ name: mediaField, type: 'string', format: 'attachment' },
		])
		mocks.mkdir.mockResolvedValueOnce(undefined)

		const attached = await pieceTest.attach(file, markdown, mediaField)

		expect(mocks.copy).toHaveBeenCalledWith(file, toPath)
		expect(mocks.mkdir).toHaveBeenCalledOnce()
		expect(attached).toEqual(updatedMarkdown)
	})

	test('attach supports default field', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const mediaField = 'cover'
		const root = 'root'
		const table = 'table' as Pieces
		const relPath = `.assets/${mediaField}/${markdown.slug}.jpg`
		const toPath = `${root}/${table}/${relPath}`
		const updatedMarkdown = makeMarkdownSample('slug', '', {
			...markdown.frontmatter,
			[mediaField]: relPath,
		})

		const pieceTest = new PieceTest(root, table)

		mocks.fileType.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.copy.mockResolvedValueOnce()
		mocks.toValidateMarkdown.mockReturnValueOnce(updatedMarkdown)
		mocks.getFrontmatterFieldSchemas.mockReturnValueOnce([
			{ name: mediaField, type: 'string', format: 'attachment' },
		])

		const attached = await pieceTest.attach(file, markdown)

		expect(mocks.copy).toHaveBeenCalledWith(file, toPath)
		expect(attached).toEqual(updatedMarkdown)
	})

	test('attach is not supported', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const mediaField = 'cover'
		const root = 'root'
		const table = 'table' as Pieces
		const relPath = `.assets/${mediaField}/${markdown.slug}.jpg`
		const updatedMarkdown = makeMarkdownSample('slug', 'note', {
			...markdown.frontmatter,
			[mediaField]: relPath,
		})

		const pieceTest = new PieceTest(root, table)

		mocks.fileType.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.copy.mockResolvedValueOnce()
		mocks.toValidateMarkdown.mockReturnValueOnce(updatedMarkdown)
		mocks.getFrontmatterFieldSchemas.mockReturnValueOnce([])
		mocks.mkdir.mockResolvedValueOnce(undefined)

		const attaching = pieceTest.attach(file, markdown, mediaField)

		expect(attaching).rejects.toThrowError()
	})

	test('attach is not supported on a field', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const mediaField = 'cover'
		const root = 'root'
		const table = 'table' as Pieces
		const relPath = `.assets/${mediaField}/${markdown.slug}.jpg`
		const updatedMarkdown = makeMarkdownSample('slug', 'note', {
			...markdown.frontmatter,
			[mediaField]: relPath,
		})

		const pieceTest = new PieceTest(root, table)

		mocks.fileType.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.copy.mockResolvedValueOnce()
		mocks.toValidateMarkdown.mockReturnValueOnce(updatedMarkdown)
		mocks.getFrontmatterFieldSchemas.mockReturnValueOnce([
			{ name: mediaField, type: 'string', format: 'attachment' },
		])
		mocks.mkdir.mockResolvedValueOnce(undefined)

		const attaching = pieceTest.attach(file, markdown, 'screenshot')

		expect(attaching).rejects.toThrowError()
	})

	test('attach does not support file type', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const mediaField = 'cover'
		const root = 'root'
		const table = 'table' as Pieces
		const relPath = `.assets/${mediaField}/${markdown.slug}.jpg`
		const updatedMarkdown = makeMarkdownSample('slug', 'note', {
			...markdown.frontmatter,
			[mediaField]: relPath,
		})

		const pieceTest = new PieceTest(root, table)

		mocks.fileType.mockResolvedValueOnce({ ext: 'png' } as FileTypeResult)
		mocks.copy.mockResolvedValueOnce()
		mocks.toValidateMarkdown.mockReturnValueOnce(updatedMarkdown)
		mocks.getFrontmatterFieldSchemas.mockReturnValueOnce([
			{ name: mediaField, type: 'string', format: 'attachment', enum: ['jpg'] },
		])
		mocks.mkdir.mockResolvedValueOnce(undefined)

		const attaching = pieceTest.attach(file, markdown, mediaField)

		expect(attaching).rejects.toThrowError()
	})

	test('dump', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const data = makeSample()

		const pieceTest = new PieceTest()

		spies.toMarkdown = vi.spyOn(pieceTest, 'toMarkdown').mockReturnValueOnce(markdown)
		spies.write = vi.spyOn(pieceTest, 'write').mockResolvedValueOnce()
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		dbMocks.queries.execute.mockResolvedValueOnce([data])

		await pieceTest.dump(dbMocks.db)

		expect(spies.toMarkdown).toHaveBeenCalledOnce()
		expect(spies.write).toHaveBeenCalledWith(markdown)
	})

	test('dump with dryRun', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const data = makeSample()

		const pieceTest = new PieceTest()

		spies.toMarkdown = vi.spyOn(pieceTest, 'toMarkdown').mockReturnValueOnce(markdown)
		spies.write = vi.spyOn(pieceTest, 'write').mockResolvedValueOnce()
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		dbMocks.queries.execute.mockResolvedValueOnce([data])

		await pieceTest.dump(dbMocks.db, true)

		expect(spies.write).not.toHaveBeenCalled()
	})

	test('dump handles error', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const data = makeSample()

		const pieceTest = new PieceTest()

		spies.toMarkdown = vi.spyOn(pieceTest, 'toMarkdown').mockResolvedValueOnce(markdown)
		spies.write = vi.spyOn(pieceTest, 'write').mockRejectedValueOnce(new Error('oof'))
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		dbMocks.queries.execute.mockResolvedValueOnce([data])

		await pieceTest.dump(dbMocks.db)

		expect(mocks.logError).toHaveBeenCalled()
	})
})
