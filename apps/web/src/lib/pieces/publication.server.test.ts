import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import {
	Piece,
	asCoreDatabase,
	sql,
	type LuzzleStorage,
	type PieceFrontmatterSchema,
	type PieceFrontmatter
} from '@luzzle/core'
import { db } from '$lib/server/database'
import type { AppDatabase } from '@luzzle/web.db'
import { getPieces } from '$lib/server/pieces'
import { getStorage } from '$lib/server/storage'
import { actions } from '../../routes/admin/piece/[...path]/source/+page.server'
import { getMarkdownPublicationStatus } from './publication.server.js'
import { MarkdownPublicationStatus } from './types.js'

vi.mock('$lib/server/database', async () => {
	const { runWebMigrations } = await import('@luzzle/web.db')
	const { migrate, getDatabaseClient } = await import('@luzzle/core')
	const coreDb = getDatabaseClient(':memory:')
	const db = coreDb.withTables<AppDatabase>()
	const core = await migrate(coreDb)
	if (core.error) throw new Error(`Test core migration failed: ${core.error}`)
	const web = await runWebMigrations(db)
	if (web.error) throw new Error(`Test web migration failed: ${web.error}`)
	return { db }
})
vi.mock('$lib/server/pieces', () => ({ getPieces: vi.fn(), getWebPiece: vi.fn() }))
vi.mock('$lib/server/storage', () => ({ getStorage: vi.fn() }))
vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture')
	return { config: makeConfig() }
})

const file = 'books/雪 ?#%.books.md'
const digest = (bytes: string | Buffer) => createHash('md5').update(bytes).digest('hex')
let savedBytes: Buffer
let modifiedAt: Date
let storage: {
	exists: ReturnType<typeof vi.fn>
	makeDirectory: ReturnType<typeof vi.fn>
	writeFile: ReturnType<typeof vi.fn>
	readFile: ReturnType<typeof vi.fn>
	createReadStream: ReturnType<typeof vi.fn>
	stat: ReturnType<typeof vi.fn>
}
let piece: Piece<PieceFrontmatter>

beforeEach(async () => {
	vi.clearAllMocks()
	await db.deleteFrom('pieces_cache').execute()
	await db.deleteFrom('pieces_items').execute()
	await db.deleteFrom('web_pieces').execute()
	savedBytes = Buffer.alloc(0)
	modifiedAt = new Date()
	storage = {
		exists: vi.fn(async () => true),
		makeDirectory: vi.fn(async () => {}),
		writeFile: vi.fn(async (path: string, content: string) => {
			expect(path).toBe(file)
			savedBytes = Buffer.from(content)
		}),
		readFile: vi.fn(async () => savedBytes.toString('utf8')),
		createReadStream: vi.fn(() => Readable.from([savedBytes])),
		stat: vi.fn(async () => ({ last_modified: modifiedAt }))
	}
	const schema = {
		title: 'books',
		type: 'object',
		properties: { title: { type: 'string' }, cover: { type: 'string', format: 'asset' } },
		required: ['title'],
		additionalProperties: false
	} as PieceFrontmatterSchema<PieceFrontmatter>
	piece = new Piece('books', storage as unknown as LuzzleStorage, schema)
	vi.mocked(getStorage).mockReturnValue(storage as unknown as ReturnType<typeof getStorage>)
	vi.mocked(getPieces).mockReturnValue({
		parseFilename: vi.fn(() => ({ type: 'books' })),
		getPiece: vi.fn(async () => piece)
	} as unknown as ReturnType<typeof getPieces>)
})

afterAll(async () => db.destroy())

function save(content: string) {
	const formData = new FormData()
	formData.set('content', content)
	return actions.save({
		params: { path: file },
		request: { formData: async () => formData }
	} as Parameters<typeof actions.save>[0])
}

async function published(hash: string) {
	await db
		.insertInto('web_pieces')
		.values({
			id: 'published-id',
			key: 'published-key',
			file_path: file,
			type: 'books',
			title: 'Published title',
			slug: 'published-book',
			json_metadata: '{"title":"Published title"}',
			note: 'Published body',
			date_added: 100,
			content_hash: hash,
			last_published_at: 200
		})
		.execute()
	return db
		.selectFrom('web_pieces')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirstOrThrow()
}

describe('getMarkdownPublicationStatus', () => {
	test.each([
		['published-hash', MarkdownPublicationStatus.MATCHING],
		['indexed-hash', MarkdownPublicationStatus.CHANGED],
		[undefined, MarkdownPublicationStatus.UNKNOWN],
		[null, MarkdownPublicationStatus.UNKNOWN],
		['', MarkdownPublicationStatus.UNKNOWN]
	] as const)('compares persisted indexed hash %j: %s', async (hash, status) => {
		if (hash !== undefined) {
			await sql`INSERT INTO pieces_cache (id, file_path, content_hash) VALUES ('cache-id', ${file}, ${hash})`.execute(
				db
			)
		}
		expect(await getMarkdownPublicationStatus(file, 'published-hash')).toBe(status)
		expect(getStorage).not.toHaveBeenCalled()
		for (const method of Object.values(storage)) expect(method).not.toHaveBeenCalled()
	})

	test.each([undefined, null, ''])(
		'missing published hash %j is unknown, not a match',
		async (hash) => {
			expect(await getMarkdownPublicationStatus(file, hash)).toBe(MarkdownPublicationStatus.UNKNOWN)
			expect(getStorage).not.toHaveBeenCalled()
		}
	)
})

test('Save creates the archive item/cache before first publication, not a serving row', async () => {
	const raw =
		'---\r\ntitle: Saved title\r\ncover: .assets/books/cover.png\r\n---\r\nA   paragraph.\r\n'
	expect(await save(raw)).toEqual({ success: true })
	const item = await db
		.selectFrom('pieces_items')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirstOrThrow()
	const cache = await db
		.selectFrom('pieces_cache')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirstOrThrow()

	expect(JSON.parse(item.frontmatter_json)).toEqual({
		title: 'Saved title',
		cover: '.assets/books/cover.png'
	})
	expect(item.note_markdown).toBe('A paragraph.\n')
	expect(JSON.parse(item.assets_json_array!)).toEqual(['.assets/books/cover.png'])
	expect(cache.content_hash).toBe(digest(savedBytes))
	expect(cache.content_hash).not.toBe(digest(raw))
	expect(storage.writeFile).toHaveBeenCalledOnce()
	expect(storage.createReadStream).toHaveBeenCalledExactlyOnceWith(file)
	expect(await db.selectFrom('web_pieces').selectAll().execute()).toEqual([])
})

test('Save updates existing item/cache while retaining serving content, hash and timestamp', async () => {
	await save('---\ntitle: Original\n---\nOriginal body')
	const originalCache = await db
		.selectFrom('pieces_cache')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirstOrThrow()
	const serving = await published(originalCache.content_hash)
	expect(await getMarkdownPublicationStatus(file, serving.content_hash)).toBe(
		MarkdownPublicationStatus.MATCHING
	)

	expect(
		await save('---\ntitle: Updated\ncover: .assets/books/new.png\n---\nUpdated body')
	).toEqual({ success: true })
	const cache = await db
		.selectFrom('pieces_cache')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirstOrThrow()
	const item = await db
		.selectFrom('pieces_items')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirstOrThrow()
	expect(cache.id).toBe(originalCache.id)
	expect(cache.content_hash).toBe(digest(savedBytes))
	expect(JSON.parse(item.frontmatter_json).title).toBe('Updated')
	expect(JSON.parse(item.assets_json_array!)).toEqual(['.assets/books/new.png'])
	expect(await getMarkdownPublicationStatus(file, serving.content_hash)).toBe(
		MarkdownPublicationStatus.CHANGED
	)
	expect(
		await db
			.selectFrom('web_pieces')
			.selectAll()
			.where('file_path', '=', file)
			.executeTakeFirstOrThrow()
	).toEqual(serving)

	await db
		.updateTable('web_pieces')
		.set({ content_hash: cache.content_hash })
		.where('file_path', '=', file)
		.execute()
	expect(await getMarkdownPublicationStatus(file, cache.content_hash)).toBe(
		MarkdownPublicationStatus.MATCHING
	)
	// A no-op Save remains matching; this tracks bytes, not a dirty event flag.
	await save('---\ntitle: Updated\ncover: .assets/books/new.png\n---\nUpdated body')
	expect(await getMarkdownPublicationStatus(file, cache.content_hash)).toBe(
		MarkdownPublicationStatus.MATCHING
	)
})

test('Save removing the last asset reference clears the indexed attachment list', async () => {
	await save('---\ntitle: Original\ncover: .assets/books/cover.png\n---\nBody')
	expect(await save('---\ntitle: Original\n---\nBody')).toEqual({ success: true })
	const item = await db
		.selectFrom('pieces_items')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirstOrThrow()
	expect(JSON.parse(item.frontmatter_json)).toEqual({ title: 'Original', cover: null })
	expect(JSON.parse(item.assets_json_array ?? '[]')).toEqual([])
})

test('external Markdown changes become visible to the same comparison after file sync', async () => {
	await save('---\ntitle: Original\n---\nOriginal body')
	const cache = await db
		.selectFrom('pieces_cache')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirstOrThrow()
	const serving = await published(cache.content_hash)
	savedBytes = Buffer.from('---\ntitle: External edit\n---\nExternal body')
	modifiedAt = new Date((cache.date_updated ?? cache.date_added) + 1)
	// Until sync, the database truthfully reports the last indexed state only.
	expect(await getMarkdownPublicationStatus(file, serving.content_hash)).toBe(
		MarkdownPublicationStatus.MATCHING
	)
	const results = []
	for await (const result of await piece.sync(asCoreDatabase(db), [file])) results.push(result)
	expect(results).toEqual([{ action: 'updated', file }])
	expect(await getMarkdownPublicationStatus(file, serving.content_hash)).toBe(
		MarkdownPublicationStatus.CHANGED
	)
	const item = await db
		.selectFrom('pieces_items')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirstOrThrow()
	expect(JSON.parse(item.frontmatter_json).title).toBe('External edit')
	expect(
		await db
			.selectFrom('web_pieces')
			.selectAll()
			.where('file_path', '=', file)
			.executeTakeFirstOrThrow()
	).toEqual(serving)
})
