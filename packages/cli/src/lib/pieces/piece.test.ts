import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { readdir, stat, writeFile, copyFile, unlink, mkdir } from 'fs/promises'
import { Dirent, existsSync, mkdirSync, Stats } from 'fs'
import {
	makeMarkdownSample,
	makeSample,
	makeValidator,
	makePiece,
	makeFrontmatterSample,
} from './piece.fixtures.js'
import { mockDatabase } from '../database.mock.js'
import { removeAllTagsFrom, addTagsTo, keywordsToTags, syncTagsFor } from '../tags/index.js'
import { addCache, removeCache, updateCache, getCache, getCacheAll } from './cache.js'
import log from '../log.js'
import { CpuInfo, cpus } from 'os'
import { fileTypeFromFile, FileTypeResult } from 'file-type'
import {
	ajv,
	PieceInsertable,
	getPieceFrontmatterKeysFromSchema,
	formatPieceFrontmatterValue,
	makePieceMarkdownOrThrow,
	makePieceMarkdown,
	makePieceMarkdownString,
	makePieceInsertable,
	makePieceUpdatable,
	extractFullMarkdown,
	initializePieceFrontMatter,
	PieceFrontmatterSchemaField,
	Pieces,
} from '@luzzle/core'
import { downloadFileOrUrlTo } from './utils.js'
import { makeCache } from './cache.fixtures.js'
import { ASSETS_DIRECTORY } from '../assets.js'

vi.mock('fs')
vi.mock('fs/promises')
vi.mock('../log.js')
vi.mock('../md.js')
vi.mock('./markdown.js')
vi.mock('../tags/index.js')
vi.mock('./cache.js')
vi.mock('os')
vi.mock('file-type')
vi.mock('@luzzle/core')
vi.mock('./utils.js')

const mocks = {
	existsSync: vi.mocked(existsSync),
	mkdirSync: vi.mocked(mkdirSync),
	mkdir: vi.mocked(mkdir),
	readdir: vi.mocked(readdir),
	writeFile: vi.mocked(writeFile),
	makePieceMarkdownOrThrow: vi.mocked(makePieceMarkdownOrThrow),
	toMarkdown: vi.mocked(makePieceMarkdown),
	toMarkdownString: vi.mocked(makePieceMarkdownString),
	removeAllTagsFrom: vi.mocked(removeAllTagsFrom),
	addTagsTo: vi.mocked(addTagsTo),
	keywordsToTags: vi.mocked(keywordsToTags),
	syncTagsFor: vi.mocked(syncTagsFor),
	extract: vi.mocked(extractFullMarkdown),
	logError: vi.spyOn(log, 'error'),
	stat: vi.mocked(stat),
	cpus: vi.mocked(cpus),
	addCache: vi.mocked(addCache),
	removeCache: vi.mocked(removeCache),
	updateCache: vi.mocked(updateCache),
	getCache: vi.mocked(getCache),
	getCacheAll: vi.mocked(getCacheAll),
	compile: vi.mocked(ajv),
	copy: vi.mocked(copyFile),
	fileType: vi.mocked(fileTypeFromFile),
	unlink: vi.mocked(unlink),
	getPieceSchemaKeys: vi.mocked(getPieceFrontmatterKeysFromSchema),
	frontmatterToDatabaseValue: vi.mocked(formatPieceFrontmatterValue),
	downloadFileOrUrlTo: vi.mocked(downloadFileOrUrlTo),
	makeInsertable: vi.mocked(makePieceInsertable),
	makeUpdatable: vi.mocked(makePieceUpdatable),
	initializePieceFrontMatter: vi.mocked(initializePieceFrontMatter),
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

	test('create', () => {
		const PieceType = makePiece()
		const markdown = makeMarkdownSample()
		const title = markdown.frontmatter.title
		const slug = markdown.slug

		mocks.initializePieceFrontMatter.mockReturnValueOnce(markdown.frontmatter)
		mocks.makePieceMarkdownOrThrow.mockReturnValueOnce(markdown)

		const piece = new PieceType()
		const pieceMarkdown = piece.create(slug, title)

		expect(pieceMarkdown).toEqual(markdown)
	})

	test('initialize', () => {
		const PieceType = makePiece()

		mocks.mkdirSync.mockReturnValue(undefined)
		mocks.existsSync.mockReturnValueOnce(true)
		mocks.existsSync.mockReturnValue(false)

		const piece = new PieceType()
		piece.initialize()

		expect(mocks.mkdirSync).toHaveBeenCalledTimes(1)
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

	test('getSlugsOutdated', async () => {
		const PieceTest = makePiece()
		const slugs = ['a', 'b', 'c']
		const fileUpdated = new Date('2201-11-11')
		const cacheUpdated = new Date('2101-11-11')

		mocks.stat.mockResolvedValue({ mtime: fileUpdated } as Stats)
		mocks.getCache.mockResolvedValue(
			makeCache({
				date_updated: cacheUpdated.getTime(),
			})
		)
		mocks.getCache.mockResolvedValueOnce(
			makeCache({
				date_added: cacheUpdated.getTime(),
				date_updated: null,
			})
		)
		mocks.getCache.mockResolvedValueOnce(null)

		const pieceTest = new PieceTest()

		spies.getSlugs = vi.spyOn(pieceTest, 'getSlugs').mockResolvedValueOnce(slugs)
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue('somewhere/slug')

		const updatedSlugs = await pieceTest.getSlugsOutdated()

		expect(updatedSlugs).toEqual(slugs)
	})

	test('getSlugsOutdated finds none', async () => {
		const PieceTest = makePiece()
		const slugs = ['a', 'b', 'c']
		const fileUpdated = new Date('2201-11-11')
		const cacheUpdated = new Date('2301-11-11')

		mocks.stat.mockResolvedValue({ mtime: fileUpdated } as Stats)
		mocks.getCache.mockResolvedValue(
			makeCache({
				date_updated: cacheUpdated.getTime(),
			})
		)

		const pieceTest = new PieceTest()

		spies.getSlugs = vi.spyOn(pieceTest, 'getSlugs').mockResolvedValueOnce(slugs)
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue('somewhere/slug')

		const updatedSlugs = await pieceTest.getSlugsOutdated()

		expect(updatedSlugs).toEqual([])
	})

	test('getSlugsOutdated logs error', async () => {
		const PieceTest = makePiece()
		const slugs = ['a']

		const pieceTest = new PieceTest()

		mocks.stat.mockRejectedValueOnce(new Error('oof'))
		spies.getSlugs = vi.spyOn(pieceTest, 'getSlugs').mockResolvedValueOnce(slugs)
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue('somewhere/slug')

		const updatedSlugs = await pieceTest.getSlugsOutdated()

		expect(mocks.logError).toHaveBeenCalledOnce()
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

		mocks.extract.mockResolvedValueOnce(
			extracted as Awaited<ReturnType<typeof extractFullMarkdown>>
		)
		mocks.makePieceMarkdownOrThrow.mockReturnValueOnce(markdown)

		const pieceTest = new PieceTest()
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue(path)
		spies.exists = vi.spyOn(pieceTest, 'exists').mockReturnValue(true)

		const get = await pieceTest.get(slug)

		expect(mocks.extract).toHaveBeenCalledWith(path)
		expect(mocks.makePieceMarkdownOrThrow).toHaveBeenCalledOnce()
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

		mocks.extract.mockResolvedValueOnce(
			extracted as Awaited<ReturnType<typeof extractFullMarkdown>>
		)
		mocks.toMarkdown.mockReturnValueOnce(markdown)

		const pieceTest = new PieceTest()
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue(path)
		spies.exists = vi.spyOn(pieceTest, 'exists').mockReturnValue(true)

		const get = await pieceTest.get(slug, false)

		expect(mocks.extract).toHaveBeenCalledWith(path)
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

		mocks.extract.mockResolvedValueOnce(
			extracted as Awaited<ReturnType<typeof extractFullMarkdown>>
		)
		mocks.makePieceMarkdownOrThrow.mockReturnValueOnce(markdown)

		const pieceTest = new PieceTest()
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue(path)
		spies.exists = vi.spyOn(pieceTest, 'exists').mockReturnValue(false)

		const get = await pieceTest.get(slug)

		expect(get).toEqual(null)
	})

	test('get catches error', async () => {
		const slug = 'slug'
		const path = '/path/to/slug.md'
		const PieceTest = makePiece()

		mocks.extract.mockRejectedValueOnce(new Error('oof'))

		const pieceTest = new PieceTest()
		spies.getPath = vi.spyOn(pieceTest, 'getPath').mockReturnValue(path)
		spies.exists = vi.spyOn(pieceTest, 'exists').mockReturnValue(true)

		const get = await pieceTest.get(slug)

		expect(mocks.logError).toHaveBeenCalledOnce()
		expect(get).toEqual(null)
	})

	test('write', async () => {
		const sample = makeMarkdownSample()
		const PieceTest = makePiece()

		mocks.toMarkdownString.mockReturnValueOnce('')
		mocks.writeFile.mockResolvedValueOnce(undefined)

		await new PieceTest().write(sample)

		expect(mocks.writeFile).toHaveBeenCalledOnce()
	})

	test('cleanUpCache', async () => {
		const slugs = ['a', 'b', 'c']
		const PieceTest = makePiece()

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.getPieceSchemaKeys.mockReturnValue([])
		mocks.removeCache.mockResolvedValue(undefined)
		mocks.getCacheAll.mockResolvedValue(slugs.map((slug) => makeCache({ slug })))

		const pieceTest = new PieceTest()

		const removed = await pieceTest.cleanUpCache([])

		expect(removed).toEqual(slugs)
		expect(mocks.removeCache).toHaveBeenCalledTimes(slugs.length)
	})

	test('cleanUpCache removes attachments', async () => {
		const slug = 'slug'
		const PieceTest = makePiece()
		const file = `${slug}.jpg`
		const file2 = `${slug}-2.png`
		const slugs = [slug]

		mocks.getPieceSchemaKeys.mockReturnValueOnce([
			{ name: 'cover', type: 'string', metadata: { format: 'attachment' } },
		])
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.removeCache.mockResolvedValue(undefined)
		mocks.getCacheAll.mockResolvedValue(slugs.map((slug) => makeCache({ slug })))
		mocks.readdir.mockResolvedValueOnce([file, file2] as unknown as Dirent[])
		mocks.unlink.mockResolvedValue(undefined)

		const pieceTest = new PieceTest()

		const removed = await pieceTest.cleanUpCache([])

		expect(removed).toEqual(slugs)
		expect(mocks.readdir).toHaveBeenCalledOnce()
		expect(mocks.unlink).toHaveBeenCalledTimes(2)
		expect(mocks.removeCache).toHaveBeenCalledTimes(slugs.length)
	})

	test('cleanUpCache catches remove failure', async () => {
		const slug = 'slug'
		const PieceTest = makePiece()
		const file = `${slug}.jpg`
		const slugs = [slug]

		mocks.getPieceSchemaKeys.mockReturnValueOnce([
			{ name: 'cover', type: 'string', metadata: { format: 'attachment' } },
		])
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.removeCache.mockResolvedValue(undefined)
		mocks.getCacheAll.mockResolvedValue(slugs.map((slug) => makeCache({ slug })))
		mocks.readdir.mockResolvedValueOnce([file] as unknown as Dirent[])
		mocks.unlink.mockRejectedValueOnce(new Error('oof'))

		const pieceTest = new PieceTest()

		const removed = await pieceTest.cleanUpCache([])

		expect(removed).toEqual(slugs)
		expect(mocks.readdir).toHaveBeenCalledOnce()
		expect(mocks.unlink).toHaveBeenCalledTimes(1)
		expect(mocks.logError).toHaveBeenCalledOnce()
		expect(mocks.removeCache).toHaveBeenCalledTimes(slugs.length)
	})

	test('cleanUpSlugs', async () => {
		const dbMocks = mockDatabase()
		const slugs = ['a', 'b', 'c']
		const slugsOnDisk = ['a', 'b']
		const PieceTest = makePiece()

		dbMocks.queries.execute.mockResolvedValueOnce(slugs.map((slug, id) => ({ id, slug })))

		await new PieceTest({ db: dbMocks.db }).cleanUpSlugs(slugsOnDisk)

		expect(mocks.removeAllTagsFrom).toHaveBeenCalledWith(dbMocks.db, [2], expect.any(String))
	})

	test('cleanUpSlugs supports dryRun', async () => {
		const dbMocks = mockDatabase()
		const slugs = ['a', 'b', 'c']
		const slugsOnDisk = ['a', 'b']
		const PieceTest = makePiece()

		dbMocks.queries.execute.mockResolvedValueOnce(slugs.map((slug, id) => ({ id, slug })))

		await new PieceTest({ db: dbMocks.db }).cleanUpSlugs(slugsOnDisk, true)

		expect(dbMocks.queries.execute).toHaveBeenCalledOnce()
		expect(mocks.removeAllTagsFrom).not.toHaveBeenCalled()
	})

	test('cleanUpSlugs catches error', async () => {
		const dbMocks = mockDatabase()
		const slugsOnDisk = ['a', 'b']
		const PieceTest = makePiece()

		dbMocks.queries.execute.mockResolvedValueOnce(slugsOnDisk)
		dbMocks.queries.execute.mockRejectedValueOnce(new Error('oof'))

		await new PieceTest({ db: dbMocks.db }).cleanUpSlugs(slugsOnDisk)

		expect(mocks.removeAllTagsFrom).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncCleanUp', async () => {
		const slugs = ['a', 'b', 'c']
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()
		spies.cleanUpCache = vi.spyOn(pieceTest, 'cleanUpCache').mockResolvedValueOnce(slugs)
		spies.cleanUpSlugs = vi.spyOn(pieceTest, 'cleanUpSlugs').mockResolvedValueOnce()
		spies.getSlugs = vi.spyOn(pieceTest, 'getSlugs').mockResolvedValueOnce(slugs)

		await pieceTest.syncCleanUp()

		expect(spies.cleanUpCache).toHaveBeenCalledOnce()
		expect(spies.cleanUpSlugs).toHaveBeenCalledOnce()
	})

	test('syncAdd', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const added = { ...markdown.frontmatter, id: 1 }

		const pieceTest = new PieceTest({ db: dbMocks.db })
		mocks.makeInsertable.mockReturnValueOnce({} as PieceInsertable)
		dbMocks.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(added)

		await pieceTest.syncAdd(markdown)

		expect(dbMocks.queries.executeTakeFirstOrThrow).toHaveBeenCalledOnce()
		expect(mocks.addTagsTo).not.toHaveBeenCalled()
	})

	test('syncAdd with keywords', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const keywords = 'a,b'.split(',')
		const markdown = makeMarkdownSample('slug', 'note', { keywords: keywords.join(',') })
		const added = { ...markdown.frontmatter, id: 1 }

		const pieceTest = new PieceTest({ db: dbMocks.db })
		mocks.makeInsertable.mockReturnValueOnce({} as PieceInsertable)
		dbMocks.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(added)
		mocks.keywordsToTags.mockReturnValueOnce(keywords)

		await pieceTest.syncAdd(markdown)

		expect(dbMocks.queries.executeTakeFirstOrThrow).toHaveBeenCalledOnce()
		expect(mocks.addTagsTo).toHaveBeenCalledWith(dbMocks.db, keywords, added.id, expect.any(String))
	})

	test('syncAdd supports dryRun', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const keywords = 'a,b'.split(',')
		const markdown = makeMarkdownSample('slug', 'note', { keywords: keywords.join(',') })

		const pieceTest = new PieceTest({ db: dbMocks.db })

		await pieceTest.syncAdd(markdown, true)

		expect(dbMocks.queries.executeTakeFirstOrThrow).not.toHaveBeenCalled()
		expect(mocks.addTagsTo).not.toHaveBeenCalled()
	})

	test('syncAdd catches error', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		dbMocks.queries.executeTakeFirstOrThrow.mockRejectedValueOnce(new Error('oof'))

		const pieceTest = new PieceTest()
		await pieceTest.syncAdd(markdown)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncMarkdown update', async () => {
		const dbMocks = mockDatabase()
		const dbData = { id: 1, slug: 'slug' }
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		dbMocks.queries.executeTakeFirst.mockResolvedValueOnce(dbData)

		const pieceTest = new PieceTest({ db: dbMocks.db })
		spies.syncUpdate = vi.spyOn(pieceTest, 'syncUpdate').mockResolvedValueOnce()

		await pieceTest.syncMarkdown(markdown)

		expect(spies.syncUpdate).toHaveBeenCalledWith(markdown, dbData, false)
	})

	test('syncMarkdown add', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		dbMocks.queries.executeTakeFirst.mockResolvedValueOnce(null)

		const pieceTest = new PieceTest({ db: dbMocks.db })
		spies.syncAdd = vi.spyOn(pieceTest, 'syncAdd').mockResolvedValueOnce()

		await pieceTest.syncMarkdown(markdown)

		expect(spies.syncAdd).toHaveBeenCalledWith(markdown, false)
	})

	test('syncUpdate', async () => {
		const dbMocks = mockDatabase()
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const updated = { ...markdown.frontmatter, id: 'asdf' }
		const pieceData = makeSample()

		const pieceTest = new PieceTest({ db: dbMocks.db })
		mocks.makeUpdatable.mockReturnValueOnce(updated)
		dbMocks.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(updated)
		mocks.keywordsToTags.mockReturnValueOnce([])

		await pieceTest.syncUpdate(markdown, pieceData)

		expect(dbMocks.queries.executeTakeFirstOrThrow).toHaveBeenCalledOnce()
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

		const pieceTest = new PieceTest({ db: dbMocks.db })
		mocks.makeUpdatable.mockReturnValueOnce(updated)
		dbMocks.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(dbUpdate)
		mocks.keywordsToTags.mockReturnValueOnce(keywords)

		await pieceTest.syncUpdate(markdown, pieceData)

		expect(dbMocks.queries.executeTakeFirstOrThrow).toHaveBeenCalledOnce()
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
		mocks.makeUpdatable.mockReturnValueOnce(updated)
		dbMocks.queries.executeTakeFirstOrThrow.mockRejectedValueOnce(new Error('oof'))

		await pieceTest.syncUpdate(markdown, pieceData)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncUpdate supports dryRun', async () => {
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()
		const pieceData = makeSample()
		const updated = { ...markdown.frontmatter, keywords: 'a' }

		const pieceTest = new PieceTest()
		mocks.makeUpdatable.mockReturnValueOnce(updated)

		await pieceTest.syncUpdate(markdown, pieceData, true)
	})

	test('toMarkdown', () => {
		const pieceValidator = makeValidator()
		const pieceMarkdown = makeMarkdownSample()
		const pieceSample = makeSample()
		const PieceTest = makePiece()

		mocks.makePieceMarkdownOrThrow.mockReturnValueOnce(pieceMarkdown)
		mocks.getPieceSchemaKeys.mockReturnValueOnce([
			{ name: 'title', type: 'string', metadata: { format: 'date-string' } },
		])
		mocks.frontmatterToDatabaseValue.mockReturnValueOnce(pieceMarkdown.frontmatter.title)
		mocks.compile.mockReturnValueOnce(pieceValidator)

		const markdown = new PieceTest().toMarkdown(pieceSample)

		expect(mocks.makePieceMarkdownOrThrow).toHaveBeenCalledWith(
			pieceMarkdown.slug,
			pieceMarkdown.note,
			pieceMarkdown.frontmatter,
			pieceValidator
		)
		expect(markdown).toEqual(pieceMarkdown)
	})

	test('toMarkdown with arrays', () => {
		const pieceValidator = makeValidator()
		const pieceMarkdown = makeMarkdownSample()
		const pieceSample = makeSample()
		const PieceTest = makePiece()
		const title = ['a', 'b']

		mocks.makePieceMarkdownOrThrow.mockReturnValueOnce(pieceMarkdown)
		mocks.getPieceSchemaKeys.mockReturnValueOnce([
			{ name: 'title', type: 'string', collection: 'array' },
		])
		mocks.frontmatterToDatabaseValue.mockReturnValueOnce(title[0])
		mocks.frontmatterToDatabaseValue.mockReturnValueOnce(title[1])
		mocks.compile.mockReturnValueOnce(pieceValidator)

		const markdown = new PieceTest().toMarkdown({
			...pieceSample,
			title: JSON.stringify(['a', 'b']),
		})

		expect(mocks.makePieceMarkdownOrThrow).toHaveBeenCalledWith(
			pieceMarkdown.slug,
			pieceMarkdown.note,
			{ ...pieceMarkdown.frontmatter, title },
			pieceValidator
		)
		expect(markdown).toEqual(pieceMarkdown)
	})

	test('sync', async () => {
		const dbMocks = mockDatabase()
		const slugs = ['a', 'b']
		const PieceTest = makePiece()
		const markdown = makeMarkdownSample()

		const pieceTest = new PieceTest({ db: dbMocks.db })
		spies.get = vi.spyOn(pieceTest, 'get').mockResolvedValueOnce(markdown)
		spies.get = vi.spyOn(pieceTest, 'get').mockResolvedValueOnce(null)
		spies.syncMarkdown = vi.spyOn(pieceTest, 'syncMarkdown').mockResolvedValue()

		await pieceTest.sync(slugs)

		expect(spies.syncMarkdown).toHaveBeenCalledOnce()
		expect(spies.syncMarkdown).toHaveBeenCalledWith(markdown, false)
		expect(mocks.logError).toHaveBeenCalledOnce()
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

	test('setField', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title'
		const value = 'new title'
		const schema: PieceFrontmatterSchemaField = { name: field, type: 'string' }
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updated = await pieceTest.setField(markdown, field, value)

		expect(updated.frontmatter[field]).toEqual(value)
	})

	test('setField throws on bad field', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title'
		const value = 'new title'
		const schema: PieceFrontmatterSchemaField = { name: 'title2', type: 'string' }
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updating = pieceTest.setField(markdown, field, value)

		expect(updating).rejects.toThrowError()
	})

	test('setField on arrays', async () => {
		const slug = 'slug'
		const note = 'note'
		const tags = ['tag1', 'tag2']
		const markdown = makeMarkdownSample(slug, note, { tags })
		const field = 'tags'
		const value = 'another-tag'
		const schema: PieceFrontmatterSchemaField = { name: field, type: 'string', collection: 'array' }
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updated = await pieceTest.setField(markdown, field, value)

		expect(updated.frontmatter[field as keyof typeof updated.frontmatter]).toEqual([...tags, value])
	})

	test('setField on booleans', async () => {
		const slug = 'slug'
		const note = 'note'
		const tags = ['tag1', 'tag2']
		const markdown = makeMarkdownSample(slug, note, { tags })
		const field = 'tags'
		const value = 'true'
		const schema: PieceFrontmatterSchemaField = { name: field, type: 'boolean' }
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updated = await pieceTest.setField(markdown, field, value)

		expect(updated.frontmatter[field as keyof typeof updated.frontmatter]).toEqual(true)
	})

	test('setField on numbers', async () => {
		const slug = 'slug'
		const note = 'note'
		const tags = ['tag1', 'tag2']
		const markdown = makeMarkdownSample(slug, note, { tags })
		const field = 'tags'
		const value = '500'
		const schema: PieceFrontmatterSchemaField = { name: field, type: 'uint32' }
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updated = await pieceTest.setField(markdown, field, value)

		expect(updated.frontmatter[field as keyof typeof updated.frontmatter]).toEqual(500)
	})
	test('setField on uninitialized arrays', async () => {
		const slug = 'slug'
		const note = 'note'
		const tags = undefined
		const markdown = makeMarkdownSample(slug, note, { tags })
		const field = 'tags'
		const value = 'another-tag'
		const schema: PieceFrontmatterSchemaField = { name: field, type: 'string', collection: 'array' }
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updated = await pieceTest.setField(markdown, field, value)

		expect(updated.frontmatter[field as keyof typeof updated.frontmatter]).toEqual([value])
	})

	test('setField on attachments', async () => {
		const markdown = makeMarkdownSample()
		const field = 'cover'
		const value = 'new-cover.jpg'
		const pieceRoot = '/luzzle'
		const table = 'table' as Pieces
		const schema: PieceFrontmatterSchemaField = {
			name: field,
			type: 'string',
			metadata: { format: 'attachment' },
		}
		const PieceTest = makePiece()

		const pieceTest = new PieceTest({ pieceRoot, table })

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))
		mocks.downloadFileOrUrlTo.mockResolvedValueOnce(value)
		mocks.unlink.mockResolvedValue(undefined)
		mocks.fileType.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.mkdir.mockResolvedValueOnce(undefined)
		mocks.copy.mockResolvedValueOnce(undefined)

		const updated = await pieceTest.setField(markdown, field, value)

		expect(updated.frontmatter[field as keyof typeof updated.frontmatter]).matches(
			new RegExp(`${ASSETS_DIRECTORY}/${field}/${markdown.slug}-.*.jpg`)
		)
	})

	test('setField on attachments fails on wrong type', async () => {
		const markdown = makeMarkdownSample()
		const field = 'cover'
		const value = 'new-cover.jpg'
		const pieceRoot = '/luzzle'
		const table = 'table' as Pieces
		const schema: PieceFrontmatterSchemaField = {
			name: field,
			type: 'string',
			metadata: { format: 'attachment', enum: ['jpg'] },
		}
		const PieceTest = makePiece()

		const pieceTest = new PieceTest({ pieceRoot, table })

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))
		mocks.downloadFileOrUrlTo.mockResolvedValueOnce(value)
		mocks.unlink.mockResolvedValue(undefined)
		mocks.fileType.mockResolvedValueOnce({ ext: 'png' } as FileTypeResult)
		mocks.mkdir.mockResolvedValueOnce(undefined)
		mocks.copy.mockResolvedValueOnce(undefined)

		const updating = pieceTest.setField(markdown, field, value)

		expect(updating).rejects.toThrowError()
	})

	test('removeField', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title'
		const schema: PieceFrontmatterSchemaField = { name: field, type: 'string' }
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updated = await pieceTest.removeField(markdown, field)

		expect(updated.frontmatter).not.toMatchObject(markdown.frontmatter)
		expect(updated.frontmatter[field]).toEqual(undefined)
	})

	test('removeField removes attachment assets', async () => {
		const cover = 'a'
		const markdown = makeMarkdownSample('slug', '', { cover })
		const field = 'cover'
		const schema: PieceFrontmatterSchemaField = {
			name: field,
			type: 'string',
			metadata: { format: 'attachment' },
		}
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.unlink.mockResolvedValue(undefined)
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updated = await pieceTest.removeField(markdown, field)

		expect(mocks.unlink).toHaveBeenCalledOnce()
		expect(updated.frontmatter).not.toMatchObject(markdown.frontmatter)
		expect(updated.frontmatter[field as keyof typeof markdown.frontmatter]).toEqual(undefined)
	})

	test('removeField removes attachment array assets', async () => {
		const cover = ['a', 'b']
		const markdown = makeMarkdownSample('slug', '', { cover })
		const field = 'cover'
		const schema: PieceFrontmatterSchemaField = {
			name: field,
			type: 'string',
			metadata: { format: 'attachment' },
		}
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.unlink.mockResolvedValue(undefined)
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updated = await pieceTest.removeField(markdown, field)

		expect(mocks.unlink).toHaveBeenCalledTimes(cover.length)
		expect(updated.frontmatter).not.toMatchObject(markdown.frontmatter)
		expect(updated.frontmatter[field as keyof typeof markdown.frontmatter]).toEqual(undefined)
	})

	test('removeField throws on bad field', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title'
		const schema: PieceFrontmatterSchemaField = { name: 'title2', type: 'string' }
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updating = pieceTest.removeField(markdown, field)

		expect(updating).rejects.toThrowError()
	})

	test('removeField throws on required field', async () => {
		const markdown = makeMarkdownSample()
		const field = 'title'
		const schema: PieceFrontmatterSchemaField = { name: field, type: 'string', required: true }
		const PieceTest = makePiece()

		const pieceTest = new PieceTest()

		spies.pieceFields = vi.spyOn(pieceTest, 'fields', 'get').mockReturnValueOnce([schema])
		mocks.makePieceMarkdownOrThrow.mockImplementation((slug, note, frontmatter) => ({
			slug,
			note,
			frontmatter,
		}))

		const updating = pieceTest.removeField(markdown, field)

		expect(updating).rejects.toThrowError()
	})
})
