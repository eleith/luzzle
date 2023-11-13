import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { readdir, stat, writeFile, copyFile } from 'fs/promises'
import { Dirent, existsSync, mkdirSync, Stats } from 'fs'
import {
	makeSchema,
	makeCacheSchema,
	makeMarkdownSample,
	makeSample,
	makeValidator,
	makePiece,
} from './piece.fixtures.js'
import { toValidatedMarkDown, toMarkDownString } from './markdown.js'
import { extract } from '../md.js'
import { mockDatabase } from '../database.mock.js'
import { removeAllTagsFrom, addTagsTo, keywordsToTags, syncTagsFor } from '../tags/index.js'
import log from '../log.js'
import { CpuInfo, cpus } from 'os'
import CacheForType from '../cache.js'
import ajv from '../ajv.js'
import { PieceTables } from '@luzzle/kysely'
import { fileTypeFromFile, FileTypeResult } from 'file-type'

vi.mock('fs')
vi.mock('fs/promises')
vi.mock('../log')
vi.mock('../md')
vi.mock('./markdown')
vi.mock('../tags/index')
vi.mock('../cache')
vi.mock('os')
vi.mock('../ajv')
vi.mock('file-type')

const mocks = {
	existsSync: vi.mocked(existsSync),
	mkdirSync: vi.mocked(mkdirSync),
	readdir: vi.mocked(readdir),
	writeFile: vi.mocked(writeFile),
	toValidateMarkDown: vi.mocked(toValidatedMarkDown),
	toMarkDownString: vi.mocked(toMarkDownString),
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
	compile: vi.spyOn(ajv, 'compile'),
	copy: vi.mocked(copyFile),
	fileType: vi.mocked(fileTypeFromFile),
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
		const pieceValidator = makeValidator()
		const pieceCacheSchema = makeCacheSchema()
		const pieceSchema = makeSchema()
		const PieceTest = makePiece()
		const pieceTable = 'table' as PieceTables
		const pieceRoot = 'piece-root'

		mocks.compile.mockReturnValueOnce(pieceValidator)

		const pieceTest = new PieceTest(pieceRoot, pieceTable, pieceSchema, pieceCacheSchema)

		// expect(pieceTest.cache).toBeInstanceOf(CacheForType)
		expect(pieceTest.validator).toBe(pieceValidator)
		expect(pieceTest.directories).contains({
			root: `${pieceRoot}/${pieceTable}`,
			assets: `${pieceRoot}/${pieceTable}/.assets`,
			'assets.cache': `${pieceRoot}/${pieceTable}/.assets.cache`,
		})
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
		const pieceTable = 'table' as PieceTables

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
		const pieceTable = 'table' as PieceTables

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
		const path = '/path/to/slug.md'
		const extracted = makeMarkdownSample()
		const PieceTest = makePiece()

		mocks.extract.mockResolvedValueOnce(extracted as Awaited<ReturnType<typeof extract>>)
		mocks.toValidateMarkDown.mockReturnValueOnce(extracted)

		const pieceTest = new PieceTest()
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue(path)
		spies.exists = vi.spyOn(pieceTest, 'exists').mockReturnValue(true)

		const get = await pieceTest.get(slug)

		expect(extract).toHaveBeenCalledWith(path)
		expect(get).toEqual(extracted)
	})

	test('get returns null', async () => {
		const slug = 'slug'
		const path = '/path/to/slug.md'
		const extracted = makeMarkdownSample()
		const PieceTest = makePiece()

		mocks.extract.mockResolvedValueOnce(extracted as Awaited<ReturnType<typeof extract>>)
		mocks.toValidateMarkDown.mockReturnValueOnce(extracted)

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
		mocks.toMarkDownString.mockReturnValueOnce('')
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

		const pieceTest = new PieceTest()

		const removed = await pieceTest.cleanUpCache([])

		expect(removed).toEqual(slugs)
		expect(mocks.CacheRemove).toHaveBeenCalledTimes(slugs.length)
	})

	test('cleanUpCache', async () => {
		const slugs = ['a', 'b', 'c']
		const PieceTest = makePiece()

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.CacheGetAllFiles.mockResolvedValue(slugs)
		mocks.CacheRemove.mockRejectedValueOnce(new Error('oof'))

		const pieceTest = new PieceTest()

		const removed = await pieceTest.cleanUpCache([])

		expect(removed).toEqual([])
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

		await pieceTest.syncCleanUp(dbMocks.db, slugs)

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
		const markdown = makeMarkdownSample({ keywords: keywords.join(',') })
		const added = { ...markdown.frontmatter, id: 1 }

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()
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
		const markdown = makeMarkdownSample({ keywords: keywords.join(',') })

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

	test('syncMarkDown update', async () => {
		const dbMocks = mockDatabase()
		const dbData = { id: 1, slug: 'slug' }
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		dbMocks.queries.executeTakeFirst.mockResolvedValueOnce(dbData)

		const pieceTest = new PieceTest()
		spies.syncUpdate = vi.spyOn(pieceTest, 'syncUpdate').mockResolvedValueOnce()

		await pieceTest.syncMarkDown(dbMocks.db, markdown)

		expect(spies.syncUpdate).toHaveBeenCalledWith(dbMocks.db, markdown, dbData, false)
	})

	test('syncMarkDown add', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		dbMocks.queries.executeTakeFirst.mockResolvedValueOnce(null)

		const pieceTest = new PieceTest()
		spies.syncAdd = vi.spyOn(pieceTest, 'syncAdd').mockResolvedValueOnce()

		await pieceTest.syncMarkDown(dbMocks.db, markdown)

		expect(spies.syncAdd).toHaveBeenCalledWith(dbMocks.db, markdown, false)
	})

	test('syncUpdate', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const updated = { ...markdown.frontmatter, id: 1 }
		const pieceData = makeSample()

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()
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
		const markdown = makeMarkdownSample({ keywords: keywords.join(',') })
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

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()
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

		const pieceTest = new PieceTest()
		spies.markAsSynced = vi.spyOn(pieceTest, 'markAsSynced').mockResolvedValueOnce()

		await pieceTest.syncUpdate(dbMocks.db, markdown, pieceData, true)

		expect(spies.markAsSynced).not.toHaveBeenCalled()
	})

	test('toMarkDown', async () => {
		const pieceValidator = makeValidator()
		const pieceMarkdown = makeMarkdownSample()
		const pieceSample = makeSample()
		const PieceTest = makePiece()

		mocks.toValidateMarkDown.mockReturnValueOnce(pieceMarkdown)
		mocks.compile.mockReturnValueOnce(pieceValidator)

		const markdown = await new PieceTest('dir', 'table' as PieceTables).toMarkDown(pieceSample)

		expect(mocks.toValidateMarkDown).toHaveBeenCalledWith(
			pieceMarkdown.slug,
			pieceMarkdown.markdown,
			pieceMarkdown['frontmatter'],
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
		spies.syncMarkDown = vi.spyOn(pieceTest, 'syncMarkDown').mockResolvedValue()

		await pieceTest.sync(dbMocks.db, slugs)

		expect(spies.syncMarkDown).toHaveBeenCalledOnce()
		expect(spies.syncMarkDown).toHaveBeenCalledWith(dbMocks.db, markdown, false)
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('attach', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const field = 'cover'
		const root = 'root'
		const table = 'table' as PieceTables
		const relPath = `.assets/${field}/${markdown.slug}.jpg`
		const toPath = `${root}/${table}/${relPath}`
		const schema = makeSchema({
			cover: {
				type: 'string',
				metadata: { luzzleFormat: 'attachment', luzzleAttachmentType: ['jpg'] },
			},
		})
		const updatedMarkdown = makeMarkdownSample({ ...markdown.frontmatter, [field]: relPath })

		const pieceTest = new PieceTest(root, table, schema)

		mocks.fileType.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.copy.mockResolvedValueOnce()
		mocks.toValidateMarkDown.mockReturnValueOnce(updatedMarkdown)

		spies.write = vi.spyOn(pieceTest, 'write').mockResolvedValueOnce()

		await pieceTest.attach(file, markdown, field)

		expect(mocks.copy).toHaveBeenCalledWith(file, toPath)
		expect(spies.write).toHaveBeenCalledWith(updatedMarkdown)
	})

	test('attach supports default field', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const field = 'cover'
		const root = 'root'
		const table = 'table' as PieceTables
		const relPath = `.assets/${field}/${markdown.slug}.jpg`
		const toPath = `${root}/${table}/${relPath}`
		const schema = makeSchema({
			cover: {
				type: 'string',
				metadata: { luzzleFormat: 'attachment', luzzleAttachmentType: ['jpg'] },
			},
		})
		const updatedMarkdown = makeMarkdownSample({ ...markdown.frontmatter, [field]: relPath })

		const pieceTest = new PieceTest(root, table, schema)

		mocks.fileType.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.copy.mockResolvedValueOnce()
		mocks.toValidateMarkDown.mockReturnValueOnce(updatedMarkdown)

		spies.write = vi.spyOn(pieceTest, 'write').mockResolvedValueOnce()

		await pieceTest.attach(file, markdown)

		expect(mocks.copy).toHaveBeenCalledWith(file, toPath)
		expect(spies.write).toHaveBeenCalledWith(updatedMarkdown)
	})

	test('attach logs error if filetype is not supported', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const field = 'cover'
		const root = 'root'
		const table = 'table' as PieceTables
		const schema = makeSchema({
			cover: {
				type: 'string',
				metadata: { luzzleFormat: 'attachment', luzzleAttachmentType: ['png'] },
			},
		})

		const pieceTest = new PieceTest(root, table, schema)

		mocks.fileType.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)

		await pieceTest.attach(file, markdown, field)

		expect(mocks.logError).toHaveBeenCalled()
	})

	test('attach logs error if field does not support attachments', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const root = 'root'
		const table = 'table' as PieceTables
		const schema = makeSchema({
			cover: {
				type: 'string',
				metadata: { luzzleFormat: 'attachment', luzzleAttachmentType: ['png'] },
			},
		})

		const pieceTest = new PieceTest(root, table, schema)

		mocks.fileType.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)

		await pieceTest.attach(file, markdown, 'thumbnail')

		expect(mocks.logError).toHaveBeenCalled()
	})

	test('attach logs error if no attachables', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const file = 'path/to/somewhere.jpg'
		const field = 'cover'

		const pieceTest = new PieceTest()
		await pieceTest.attach(file, markdown, field)

		expect(mocks.logError).toHaveBeenCalled()
	})

	test('dump', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const data = makeSample()

		const pieceTest = new PieceTest()

		spies.toMarkDown = vi.spyOn(pieceTest, 'toMarkDown').mockResolvedValueOnce(markdown)
		spies.write = vi.spyOn(pieceTest, 'write').mockResolvedValueOnce()
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		dbMocks.queries.execute.mockResolvedValueOnce([data])

		await pieceTest.dump(dbMocks.db)

		expect(spies.toMarkDown).toHaveBeenCalledOnce()
		expect(spies.write).toHaveBeenCalledWith(markdown)
	})

	test('dump with dryRun', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const data = makeSample()

		const pieceTest = new PieceTest()

		spies.toMarkDown = vi.spyOn(pieceTest, 'toMarkDown').mockResolvedValueOnce(markdown)
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

		spies.toMarkDown = vi.spyOn(pieceTest, 'toMarkDown').mockResolvedValueOnce(markdown)
		spies.write = vi.spyOn(pieceTest, 'write').mockRejectedValueOnce(new Error('oof'))
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		dbMocks.queries.execute.mockResolvedValueOnce([data])

		await pieceTest.dump(dbMocks.db)

		expect(mocks.logError).toHaveBeenCalled()
	})
})
