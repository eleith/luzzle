import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Kysely } from 'kysely'
import type { LuzzleTables } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { WebDatabase } from '../../services/db.js'
import type { WorkerContext } from '../../services/context.js'
import { setupDatabase, teardownDatabase } from '../../../test/db.js'
import { webSyncStep } from './index.js'

type FullDb = Kysely<WebDatabase & LuzzleTables>

function makeConfig(): Config {
	return {
		paths: { database: 'db.sqlite', config: '/app/config.yaml' },
		assets: { salt: 'salt' },
		pieces: [
			{
				type: 'books',
				fields: {
					title: 'title',
					date_consumed: 'date_consumed',
					summary: 'summary',
					tags: 'tags',
				},
			},
		],
	} as unknown as Config
}

let db: FullDb
let ctx: WorkerContext

beforeEach(async () => {
	db = (await setupDatabase()).withTables<LuzzleTables>() as FullDb
	ctx = {
		config: makeConfig(),
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		},
		rclone: {} as WorkerContext['rclone'],
		db: db as unknown as WorkerContext['db'],
	}
})

afterEach(async () => {
	await teardownDatabase(db)
})

async function seedItem(over: Partial<Record<string, unknown>> = {}) {
	const row = {
		id: 'item-1',
		file_path: 'books/great.md',
		type: 'books',
		date_added: 1700000000,
		date_updated: 1700001000,
		note_markdown: 'a note',
		frontmatter_json: JSON.stringify({ title: 'Great Book', tags: ['fiction', 'classic'] }),
		assets_json_array: '[]',
		...over,
	}
	await (
		db.insertInto('pieces_items') as unknown as {
			values: (v: typeof row) => { execute: () => Promise<void> }
		}
	)
		.values(row)
		.execute()
	return row
}

async function syncPaths(filePaths: string[]) {
	const sources = await Promise.all(
		filePaths.map(async (filePath) => ({
			item: await db
				.selectFrom('pieces_items')
				.selectAll()
				.where('file_path', '=', filePath)
				.executeTakeFirstOrThrow(),
			contentHash: `hash:${filePath}`,
		}))
	)
	return webSyncStep.run(sources, ctx)
}

describe('webSyncStep', () => {
	test('upserts supplied sources and returns prepared metadata with the captured hash', async () => {
		await seedItem()
		const result = await syncPaths(['books/great.md'])

		expect(result).toMatchObject({
			status: 'completed',
			value: [
				{
					webPiece: { id: 'item-1', title: 'Great Book', slug: 'great', type: 'books' },
					contentHash: 'hash:books/great.md',
					assetKeyToPath: [],
					wasPublished: false,
				},
			],
		})

		const rows = await db.selectFrom('web_pieces').selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0].id).toBe('item-1')
		expect(rows[0].title).toBe('Great Book')
		expect(rows[0].slug).toBe('great')
		expect(rows[0].type).toBe('books')
	})

	test('keeps the public slug while preparing and persisting changed content and configuration', async () => {
		await seedItem()
		await syncPaths(['books/great.md'])
		const first = await db.selectFrom('web_pieces').select(['slug', 'key']).executeTakeFirst()
		ctx.config.assets.salt = 'new-salt'

		await db
			.updateTable('pieces_items')
			.set({ frontmatter_json: JSON.stringify({ title: 'Renamed', tags: [] }) })
			.where('id', '=', 'item-1')
			.execute()
		const result = await syncPaths(['books/great.md'])

		const after = await db.selectFrom('web_pieces').selectAll().executeTakeFirst()
		expect(after!.slug).toBe(first!.slug)
		expect(after!.title).toBe('Renamed')
		expect(after!.key).not.toBe(first!.key)
		expect(result).toMatchObject({
			status: 'completed',
			value: [
				{ webPiece: { slug: first!.slug, key: after!.key, title: 'Renamed' }, wasPublished: true },
			],
		})
	})

	test('generates unique slugs when filenames collide within type', async () => {
		await seedItem({ id: 'a', file_path: 'books/great.md' })
		await seedItem({ id: 'b', file_path: 'archive/great.md' })

		const result = await syncPaths(['books/great.md', 'archive/great.md'])

		const rows = await db.selectFrom('web_pieces').select(['id', 'slug']).orderBy('id').execute()
		expect(rows.map((r) => r.slug).sort()).toEqual(['great', 'great--1'])
		expect(result).toMatchObject({
			status: 'completed',
			value: [
				{ webPiece: { id: 'a', slug: 'great' }, contentHash: 'hash:books/great.md' },
				{ webPiece: { id: 'b', slug: 'great--1' }, contentHash: 'hash:archive/great.md' },
			],
		})
	})

	test('sanitizes metadata assets and returns the matching key-to-path map for transforms', async () => {
		await seedItem({
			frontmatter_json: JSON.stringify({
				title: 'X',
				cover: 'books/great/cover.png',
				tags: [],
			}),
			assets_json_array: JSON.stringify(['books/great/cover.png']),
		})

		const result = await syncPaths(['books/great.md'])

		const row = await db.selectFrom('web_pieces').select('json_metadata').executeTakeFirst()
		const parsed = JSON.parse(row!.json_metadata)
		expect(parsed.cover).not.toBe('books/great/cover.png')
		expect(parsed.cover).toMatch(/^[a-f0-9]{64}$/)
		expect(result).toMatchObject({
			status: 'completed',
			value: [
				{
					webPiece: { json_metadata: row!.json_metadata },
					assetKeyToPath: [[parsed.cover, 'books/great/cover.png']],
				},
			],
		})
	})

	test('rejects supplied source types not in config.pieces', async () => {
		await seedItem({ id: 'x', type: 'unknown', file_path: 'unknown/x.md' })
		await expect(syncPaths(['unknown/x.md'])).rejects.toThrow('Piece type is not configured')

		const rows = await db.selectFrom('web_pieces').selectAll().execute()
		expect(rows).toHaveLength(0)
	})
})
