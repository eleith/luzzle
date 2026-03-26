import { describe, expect, test, vi, afterEach, beforeEach } from 'vitest'
import {
	makeMarkdownSample,
	makePieceItemSelectable,
	makePieceMock,
	makeSchema,
	makeStorage,
} from './Piece.fixtures.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { type LuzzleDatabase } from '../database/tables/index.js'
import * as cache from './cache.js'
import * as item from './item.js'
import * as items from './items.js'
import * as pieceUtils from './utils/piece.js'
import slugify from '@sindresorhus/slugify'
import { StorageStat, LuzzleInsertable } from '../index.js'
import { PassThrough } from 'stream'
import { CpuInfo, cpus } from 'os'
import { makeCache } from './cache.fixtures.js'
import { ReadStream } from 'fs'

vi.mock('./cache.js')
vi.mock('./item.js')
vi.mock('./items.js')
vi.mock('./utils/piece.js')
vi.mock('os')
vi.mock('@sindresorhus/slugify')

const mocks = {
	cache: vi.mocked(cache),
	item: vi.mocked(item),
	items: vi.mocked(items),
	pieceUtils: vi.mocked(pieceUtils),
	slugify: vi.mocked(slugify),
	cpus: vi.mocked(cpus),
}

let db: LuzzleDatabase

beforeEach(async () => {
	db = await setupDatabase()
})

describe('pieces/Piece.ts', () => {
	afterEach(async () => {
		await teardownDatabase(db)
		vi.clearAllMocks()
	})

	test('constructor throws on name mismatch', () => {
		const PieceType = makePieceMock()
		const schema = makeSchema('table')
		const storage = makeStorage()
		expect(() => new PieceType('mismatch', storage, schema)).toThrow(
			'does not match the schema title'
		)
	})

	test('create generates a new markdown piece', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)

		mocks.slugify.mockReturnValue('my-title')
		vi.spyOn(storage, 'exists').mockResolvedValue(false)

		const result = await piece.create('dir', 'My Title')
		expect(result.piece).toBe('table')
		expect(result.frontmatter.title).toBe('title')
	})

	test('create throws if file already exists', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)

		mocks.slugify.mockReturnValue('my-title')
		vi.spyOn(storage, 'exists').mockResolvedValue(true)

		await expect(piece.create('dir', 'My Title')).rejects.toThrow('file already exists')
	})

	test('delete removes file if it exists', async () => {
		const storage = makeStorage()
		const PieceType = makePieceMock()
		const piece = new PieceType('table', storage)

		vi.spyOn(storage, 'exists').mockResolvedValue(true)
		vi.spyOn(storage, 'delete').mockResolvedValue(undefined)

		await piece.delete('file.md')
		expect(storage.delete).toHaveBeenCalledWith('file.md')
	})

	test('delete throws if file missing', async () => {
		const storage = makeStorage()
		const PieceType = makePieceMock()
		const piece = new PieceType('table', storage)

		vi.spyOn(storage, 'exists').mockResolvedValue(false)

		await expect(piece.delete('file.md')).rejects.toThrow('does not exist')
	})

	test('get schema', () => {
		const PieceType = makePieceMock()
		const type = 'table'
		const schema = makeSchema(type)
		const storage = makeStorage('root')

		const piece = new PieceType(type, storage, schema)

		expect(piece.schema).toEqual(schema)
	})

	test('isOutdated returns true if file is newer than cache', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)

		mocks.cache.getCache.mockResolvedValue(
			makeCache({
				date_updated: 1000,
				date_added: 1000,
			})
		)
		vi.spyOn(storage, 'stat').mockResolvedValue({ last_modified: new Date(2000) } as StorageStat)

		expect(await piece.isOutdated('file.md', db)).toBe(true)
	})

	test('isOutdated by date_added', async () => {
		const filename = '/path/to/slug.books.md'
		const PieceType = makePieceMock()
		const cacheDate = new Date('11-11-2000').getTime()
		const fileDate = new Date('11-11-2001')
		const storage = makeStorage()
		const pieceTest = new PieceType('table', storage)

		mocks.cache.getCache.mockResolvedValue(
			makeCache({
				date_added: cacheDate,
				date_updated: null,
				id: '1',
				file_path: filename,
				content_hash: 'h',
			})
		)
		vi.spyOn(storage, 'stat').mockResolvedValue({ last_modified: fileDate } as StorageStat)

		const isOutdated = await pieceTest.isOutdated(filename, db)
		expect(isOutdated).toEqual(true)
	})

	test('isOutdated returns false if cache is current', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)

		mocks.cache.getCache.mockResolvedValue(
			makeCache({
				date_updated: 3000,
				date_added: 3000,
			})
		)
		vi.spyOn(storage, 'stat').mockResolvedValue({ last_modified: new Date(2000) } as StorageStat)

		expect(await piece.isOutdated('file.md', db)).toBe(false)
	})

	test('isOutdated throws', async () => {
		const filename = 'file.md'
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const pieceTest = new PieceType('table', storage)

		vi.spyOn(storage, 'stat').mockRejectedValue(new Error('oof'))
		await expect(pieceTest.isOutdated(filename, db)).rejects.toThrow()
	})

	test('validate calls item.validatePieceItem', () => {
		const PieceType = makePieceMock()
		const piece = new PieceType()
		const markdown = makeMarkdownSample()

		mocks.item.validatePieceItem.mockReturnValue(true)
		const result = piece.validate(markdown)
		expect(result.isValid).toBe(true)
	})

	test('validate returns errors on failure', () => {
		const PieceType = makePieceMock()
		const piece = new PieceType()
		const markdown = makeMarkdownSample()

		mocks.item.validatePieceItem.mockReturnValue(false)
		mocks.item.getValidatePieceItemErrors.mockReturnValue(['error'])

		const result = piece.validate(markdown)
		expect(result.isValid).toBe(false)
		if (!result.isValid) {
			expect(result.errors).toEqual(['error'])
		}
	})

	test('get reads and extracts markdown', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const fm = { title: 'sample' }

		vi.spyOn(storage, 'exists').mockResolvedValue(true)
		vi.spyOn(storage, 'readFile').mockResolvedValue('---\ntitle: sample\n---\nbody')

		const result = await piece.get('file.md')
		expect(result.frontmatter.title).toBe(fm.title)
		expect(result.note).toBe('body')
	})

	test('get throws if file missing', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		vi.spyOn(storage, 'exists').mockResolvedValue(false)
		await expect(piece.get('file.md')).rejects.toThrow('does not exist')
	})

	test('write saves markdown if valid', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const markdown = makeMarkdownSample()

		mocks.item.validatePieceItem.mockReturnValue(true)
		vi.spyOn(storage, 'writeFile').mockResolvedValue(undefined)

		await piece.write(markdown)
		expect(storage.writeFile).toHaveBeenCalled()
	})

	test('write throws if invalid', async () => {
		const piece = new (makePieceMock())()
		const markdown = makeMarkdownSample()

		mocks.item.validatePieceItem.mockReturnValue(false)
		mocks.item.getValidatePieceItemErrors.mockReturnValue(['bad'])

		await expect(piece.write(markdown)).rejects.toThrow('Could not write')
	})

	test('prune deletes missing pieces from DB', async () => {
		const PieceType = makePieceMock()
		const piece = new PieceType('table')

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.items.selectItems.mockResolvedValue([
			makePieceItemSelectable({ file_path: 'missing.md' }),
		])
		mocks.items.deleteItem.mockResolvedValue(undefined)

		const stream = await piece.prune(db, ['exists.md'])
		for await (const result of stream) {
			if (!result.error) {
				expect(result.action).toBe('pruned')
			}
		}
		expect(mocks.items.deleteItem).toHaveBeenCalledWith(db, 'missing.md')
	})

	test('prune handles dryRun', async () => {
		const PieceType = makePieceMock()
		const piece = new PieceType('table')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.items.selectItems.mockResolvedValue([
			makePieceItemSelectable({ file_path: 'missing.md' }),
		])

		const stream = await piece.prune(db, [], { dryRun: true })
		for await (const result of stream) {
			if (!result.error) {
				expect(result.action).toBe('pruned')
			}
		}
		expect(mocks.items.deleteItem).not.toHaveBeenCalled()
	})

	test('prune handles error', async () => {
		const PieceType = makePieceMock()
		const piece = new PieceType('table')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.items.selectItems.mockResolvedValue([makePieceItemSelectable({ file_path: 'm.md' })])
		mocks.items.deleteItem.mockRejectedValue(new Error('oof'))

		const stream = await piece.prune(db, [])
		for await (const result of stream) {
			expect(result.error).toBe(true)
		}
	})

	test('syncMarkdownAdd inserts piece and adds cache', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const markdown = makeMarkdownSample()

		mocks.item.makePieceItemInsertable.mockReturnValue({} as LuzzleInsertable<'pieces_items'>)
		mocks.pieceUtils.calculateHashFromFile.mockResolvedValue('hash')
		vi.spyOn(storage, 'createReadStream').mockReturnValue({} as ReadStream)

		await piece.syncMarkdownAdd(db, markdown)
		expect(mocks.items.insertItem).toHaveBeenCalled()
		expect(mocks.cache.addCache).toHaveBeenCalledWith(db, markdown.filePath, 'hash')
	})

	test('syncMarkdown handles update or add', async () => {
		const PieceType = makePieceMock()
		const piece = new PieceType('table')
		const markdown = makeMarkdownSample()

		const syncAddSpy = vi.spyOn(piece, 'syncMarkdownAdd').mockResolvedValue(undefined)
		const syncUpdateSpy = vi.spyOn(piece, 'syncMarkdownUpdate').mockResolvedValue(undefined)

		mocks.items.selectItem.mockResolvedValueOnce(undefined)
		await piece.syncMarkdown(db, markdown)
		expect(syncAddSpy).toHaveBeenCalled()

		mocks.items.selectItem.mockResolvedValueOnce(makePieceItemSelectable({ id: '1' }))
		await piece.syncMarkdown(db, markdown)
		expect(syncUpdateSpy).toHaveBeenCalled()
	})

	test('syncMarkdownUpdate updates item and cache', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const markdown = makeMarkdownSample()
		const data = makePieceItemSelectable()

		mocks.item.makePieceItemUpdatable.mockReturnValue({})
		mocks.pieceUtils.calculateHashFromFile.mockResolvedValue('new-hash')
		vi.spyOn(storage, 'createReadStream').mockReturnValue({} as ReadStream)

		await piece.syncMarkdownUpdate(db, markdown, data)
		expect(mocks.items.updateItem).toHaveBeenCalled()
		expect(mocks.cache.updateCache).toHaveBeenCalledWith(db, data.file_path, 'new-hash')
	})

	test('sync adds new pieces to DB', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const markdown = makeMarkdownSample({ filePath: 'new.md' })

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		vi.spyOn(piece, 'get').mockResolvedValue(markdown)
		mocks.items.selectItem.mockResolvedValue(undefined)

		const syncAddSpy = vi.spyOn(piece, 'syncMarkdownAdd').mockResolvedValue(undefined)

		const stream = await piece.sync(db, ['new.md'])
		for await (const result of stream) {
			if (!result.error) {
				expect(result.action).toBe('added')
			}
		}
		expect(syncAddSpy).toHaveBeenCalled()
	})

	test('sync updates existing pieces if hash changed', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const markdown = makeMarkdownSample({ filePath: 'u.md' })

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		vi.spyOn(piece, 'get').mockResolvedValue(markdown)
		mocks.items.selectItem.mockResolvedValue(makePieceItemSelectable({ id: '1' }))
		mocks.pieceUtils.calculateHashFromFile.mockResolvedValue('new-hash')
		mocks.cache.getCache.mockResolvedValue(makeCache({ content_hash: 'old-hash' }))
		vi.spyOn(storage, 'createReadStream').mockReturnValue({} as ReadStream)

		const syncUpdateSpy = vi.spyOn(piece, 'syncMarkdownUpdate').mockResolvedValue(undefined)

		const stream = await piece.sync(db, ['u.md'])
		for await (const result of stream) {
			if (!result.error) {
				expect(result.action).toBe('updated')
			}
		}
		expect(syncUpdateSpy).toHaveBeenCalled()
	})

	test('sync skips unchanged pieces', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const markdown = makeMarkdownSample({ filePath: 's.md' })

		mocks.cpus.mockReturnValue([{} as CpuInfo])
		vi.spyOn(piece, 'get').mockResolvedValue(markdown)
		mocks.items.selectItem.mockResolvedValue(makePieceItemSelectable({ id: '1' }))
		mocks.pieceUtils.calculateHashFromFile.mockResolvedValue('same-hash')
		mocks.cache.getCache.mockResolvedValue(makeCache({ content_hash: 'same-hash' }))
		vi.spyOn(storage, 'createReadStream').mockReturnValue({} as ReadStream)

		const stream = await piece.sync(db, ['s.md'])
		for await (const result of stream) {
			if (!result.error) {
				expect(result.action).toBe('skipped')
			}
		}
	})

	test('sync handles dryRun', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const markdown = makeMarkdownSample({ filePath: 'new.md' })

		vi.spyOn(piece, 'get').mockResolvedValue(markdown)
		mocks.items.selectItem.mockResolvedValue(undefined)
		const syncAddSpy = vi.spyOn(piece, 'syncMarkdownAdd').mockResolvedValue(undefined)

		const stream = await piece.sync(db, ['new.md'], { dryRun: true })
		for await (const result of stream) {
			if (!result.error) {
				expect(result.action).toBe('added')
			}
		}
		expect(syncAddSpy).not.toHaveBeenCalled()
	})

	test('sync handles dryRun update', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const markdown = makeMarkdownSample({ filePath: 'u.md' })

		vi.spyOn(piece, 'get').mockResolvedValue(markdown)
		mocks.items.selectItem.mockResolvedValue(makePieceItemSelectable({ id: '1' }))
		mocks.pieceUtils.calculateHashFromFile.mockResolvedValue('new-hash')
		mocks.cache.getCache.mockResolvedValue(makeCache({ content_hash: 'old-hash' }))
		vi.spyOn(storage, 'createReadStream').mockReturnValue({} as ReadStream)

		const syncUpdateSpy = vi.spyOn(piece, 'syncMarkdownUpdate').mockResolvedValue(undefined)

		const stream = await piece.sync(db, ['u.md'], { dryRun: true })
		for await (const result of stream) {
			if (!result.error) {
				expect(result.action).toBe('updated')
			}
		}
		expect(syncUpdateSpy).not.toHaveBeenCalled()
	})

	test('sync handles force update even if hash same', async () => {
		const PieceType = makePieceMock()
		const storage = makeStorage()
		const piece = new PieceType('table', storage)
		const markdown = makeMarkdownSample({ filePath: 'u.md' })

		vi.spyOn(piece, 'get').mockResolvedValue(markdown)
		mocks.items.selectItem.mockResolvedValue(makePieceItemSelectable({ id: '1' }))
		mocks.pieceUtils.calculateHashFromFile.mockResolvedValue('same-hash')
		mocks.cache.getCache.mockResolvedValue(makeCache({ content_hash: 'same-hash' }))
		vi.spyOn(storage, 'createReadStream').mockReturnValue({} as ReadStream)

		const syncUpdateSpy = vi.spyOn(piece, 'syncMarkdownUpdate').mockResolvedValue(undefined)

		const stream = await piece.sync(db, ['u.md'], { force: true })
		for await (const result of stream) {
			if (!result.error) {
				expect(result.action).toBe('updated')
			}
		}
		expect(syncUpdateSpy).toHaveBeenCalled()
	})

	test('sync handles errors', async () => {
		const PieceType = makePieceMock()
		const piece = new PieceType('table')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		vi.spyOn(piece, 'get').mockRejectedValue(new Error('oof'))

		const stream = await piece.sync(db, ['e.md'])
		for await (const result of stream) {
			expect(result.error).toBe(true)
		}
	})

	test('toMarkdown restores frontmatter from DB JSON', () => {
		const PieceType = makePieceMock()
		const piece = new PieceType('table')
		const dbPiece = makePieceItemSelectable({
			frontmatter_json: JSON.stringify({ title: 'db-title', keywords: ['a', 'b'] }),
		})

		const result = piece.toMarkdown(dbPiece)
		expect(result.frontmatter.title).toBe('db-title')
		expect((result.frontmatter as Record<string, unknown>).keywords).toEqual(['a', 'b'])
	})

	test('getField', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			title: { type: 'string' },
			subtitle: { type: 'string', nullable: true },
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 'old', subtitle: 'old' } })

		mocks.pieceUtils.makePieceValue.mockImplementation(async (_, v) => v as string)

		const field = piece.getField(markdown, 'subtitle')
		expect(field).toBe('old')
	})

	test('setFields updates multiple fields', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			title: { type: 'string' },
			subtitle: { type: 'string', nullable: true },
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 'old', subtitle: 'old' } })

		mocks.pieceUtils.makePieceValue.mockImplementation(async (_, v) => v as string)

		const updated = await piece.setFields(markdown, { title: 'new', subtitle: 'new' })
		expect(updated.frontmatter.title).toBe('new')
		expect((updated.frontmatter as Record<string, unknown>).subtitle).toBe('new')
	})

	test('setField with nested path', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			meta: {
				type: 'object',
				properties: { author: { type: 'string' } },
			},
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't' } })

		mocks.pieceUtils.makePieceValue.mockImplementation(async (_, v) => v as string)

		const updated = await piece.setField(markdown, 'meta.author', 'Bob')
		const fm = updated.frontmatter as unknown as Record<string, Record<string, unknown>>
		expect(fm.meta.author).toBe('Bob')
	})

	test('setField appends to nested array', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			meta: {
				type: 'object',
				properties: { tags: { type: 'array', items: { type: 'string' } } },
			},
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 'title', meta: { tags: ['a'] } } })

		mocks.pieceUtils.makePieceValue.mockImplementation(async (_, v) => v as string)

		const updated = await piece.setField(markdown, 'meta.tags', 'b')
		const fm = updated.frontmatter as unknown as Record<string, Record<string, string[]>>
		expect(fm.meta.tags).toEqual(['a', 'b'])
	})

	test('setField initializes missing array field', async () => {
		const PieceType = makePieceMock()

		const schema = makeSchema({ tags: { type: 'array', items: { type: 'string' } } })

		const piece = new PieceType('table', makeStorage(), schema)

		const markdown = makeMarkdownSample({ frontmatter: { title: 't' } })

		mocks.pieceUtils.makePieceValue.mockImplementation(async (_, v) => v as string)

		const updated = await piece.setField(markdown, 'tags', 'tag1')

		const fm = updated.frontmatter as unknown as Record<string, string[]>

		expect(fm.tags).toEqual(['tag1'])
	})

	test('setField handles an array of values', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			tags: { type: 'array', items: { type: 'string' } },
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't', tags: ['a'] } })

		mocks.pieceUtils.makePieceValue.mockImplementation(async (_, v) => v as string)

		const updated = await piece.setField(markdown, 'tags', ['b', 'c'])
		const fm = updated.frontmatter as unknown as Record<string, string[]>
		expect(fm.tags).toEqual(['a', 'b', 'c'])
	})

	test('setField attaches assets even in nested paths', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			meta: {
				type: 'object',
				properties: { cover: { type: 'string', format: 'asset' } },
			},
		})
		const storage = makeStorage()
		const piece = new PieceType('table', storage, schema)
		const markdown = makeMarkdownSample()

		mocks.pieceUtils.makePieceValue.mockResolvedValue({
			stream: new PassThrough() as unknown as ReadStream,
		})
		mocks.pieceUtils.isAttachableStream.mockReturnValueOnce(true)
		mocks.pieceUtils.makePieceAttachment.mockResolvedValue('assets/cover.jpg')

		const updated = await piece.setField(markdown, 'meta.cover', 'upload-me')
		const fm = updated.frontmatter as unknown as Record<string, Record<string, string>>
		expect(fm.meta.cover).toBe('assets/cover.jpg')
		expect(mocks.pieceUtils.makePieceAttachment).toHaveBeenCalled()
	})

	test('setField handles set error', async () => {
		const PieceType = makePieceMock()
		const piece = new PieceType('table')
		const markdown = makeMarkdownSample()
		mocks.pieceUtils.makePieceValue.mockRejectedValue(new Error('bad'))

		const result = await piece.setField(markdown, 'title', 'new')
		expect(result).toBe(markdown)
	})

	test('setField throws on bad field', async () => {
		const PieceType = makePieceMock()
		const piece = new PieceType('table')
		const markdown = makeMarkdownSample()

		const setting = piece.setField(markdown, 'title2', 'new')
		expect(setting).rejects.toThrow()
	})

	test('removeField unsets a nested value', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			meta: {
				type: 'object',
				nullable: true,
				properties: { author: { type: 'string', nullable: true } },
			},
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't', meta: { author: 'Alice' } } })

		const updated = await piece.removeField(markdown, 'meta.author')
		const fm = updated.frontmatter as unknown as Record<string, Record<string, unknown>>
		expect(fm.meta).toBeUndefined()
	})
	test('removeField removes specific array index', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			tags: { type: 'array', nullable: true, items: { type: 'string', nullable: true } },
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't', tags: ['a', 'b', 'c'] } })

		const updated = await piece.removeField(markdown, 'tags.1')
		const fm = updated.frontmatter as unknown as Record<string, string[]>
		expect(fm.tags).toEqual(['a', 'c'])
	})

	test('removeField removes by value from array', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			tags: { type: 'array', nullable: true, items: { type: 'string', nullable: true } },
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't', tags: ['a', 'b'] } })

		mocks.pieceUtils.makePieceValue.mockImplementation(async (_, v) => v as string)

		const updated = await piece.removeField(markdown, 'tags', 'a')
		const fm = updated.frontmatter as unknown as Record<string, string[]>
		expect(fm.tags).toEqual(['b'])
	})

	test('removeField returns markdown if array value missing', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			tags: { type: 'array', nullable: true, items: { type: 'string', nullable: true } },
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't', tags: ['a'] } })
		mocks.pieceUtils.makePieceValue.mockResolvedValue('b')

		const result = await piece.removeField(markdown, 'tags', 'b')
		expect(result).toStrictEqual(markdown)
	})

	test('removeField handles scalars by value', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({ subtitle: { type: 'string', nullable: true } })
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't', subtitle: 's' } })
		mocks.pieceUtils.makePieceValue.mockResolvedValue('s')

		const updated = await piece.removeField(markdown, 'subtitle', 's')
		expect((updated.frontmatter as Record<string, unknown>).subtitle).toBeUndefined()
	})

	test('removeField skips removal if scalar value mismatch', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({ subtitle: { type: 'string', nullable: true } })
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't', subtitle: 's' } })

		// Setup markdown so current value is 's'
		// Our mock return value will be 'mismatch'
		mocks.pieceUtils.makePieceValue.mockResolvedValue('mismatch')

		const result = await piece.removeField(markdown, 'subtitle', 'mismatch')
		expect(result).toStrictEqual(markdown)
	})

	test('removeField throws on required field', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			title: { type: 'string', nullable: false },
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't' } })

		await expect(piece.removeField(markdown, 'title')).rejects.toThrow('is a required field')
	})

	test('removeField throws on bad field', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			title: { type: 'string', nullable: false },
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't' } })

		await expect(piece.removeField(markdown, 'title2')).rejects.toThrow()
	})

	test('removeFields updates multiple fields', async () => {
		const PieceType = makePieceMock()
		const schema = makeSchema({
			s1: { type: 'string', nullable: true },
			s2: { type: 'string', nullable: true },
		})
		const piece = new PieceType('table', makeStorage(), schema)
		const markdown = makeMarkdownSample({ frontmatter: { title: 't', s1: 'v', s2: 'v' } })

		const updated = await piece.removeFields(markdown, ['s1', 's2'])
		const fm = updated.frontmatter as Record<string, unknown>
		expect(fm.s1).toBeUndefined()
		expect(fm.s2).toBeUndefined()
	})
})
