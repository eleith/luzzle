import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Kysely } from 'kysely'
import type { LuzzleTables } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { Logger } from '../logger.js'
import type { WebDatabase } from '../db.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { runWebSync } from './web-sync.js'

type FullDb = Kysely<WebDatabase & LuzzleTables>

function makeLogger(): Logger {
	return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

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
let logger: Logger

beforeEach(async () => {
	db = (await setupDatabase()).withTables<LuzzleTables>() as FullDb
	logger = makeLogger()
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
	// `date_added` is typed as auto-populated in core; in tests we set it explicitly.
	await (db.insertInto('pieces_items') as unknown as {
		values: (v: typeof row) => { execute: () => Promise<void> }
	})
		.values(row)
		.execute()
	return row
}

describe('lib/web-sync', () => {
	test('upserts a web_pieces row from pieces_items', async () => {
		await seedItem()
		await runWebSync(db, makeConfig(), logger)

		const rows = await db.selectFrom('web_pieces').selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0].id).toBe('item-1')
		expect(rows[0].title).toBe('Great Book')
		expect(rows[0].slug).toBe('great')
		expect(rows[0].type).toBe('books')
	})

	test('inserts web_pieces_tags from frontmatter', async () => {
		await seedItem()
		await runWebSync(db, makeConfig(), logger)

		const tags = await db
			.selectFrom('web_pieces_tags')
			.selectAll()
			.orderBy('tag')
			.execute()
		expect(tags.map((t) => t.tag)).toEqual(['classic', 'fiction'])
		expect(tags[0].piece_id).toBe('item-1')
		expect(tags[0].piece_slug).toBe('great')
	})

	test('keeps slug stable across re-runs', async () => {
		await seedItem()
		await runWebSync(db, makeConfig(), logger)
		const first = await db.selectFrom('web_pieces').select('slug').executeTakeFirst()

		await db
			.updateTable('pieces_items')
			.set({ frontmatter_json: JSON.stringify({ title: 'Renamed', tags: [] }) })
			.where('id', '=', 'item-1')
			.execute()
		await runWebSync(db, makeConfig(), logger)

		const after = await db.selectFrom('web_pieces').selectAll().executeTakeFirst()
		expect(after!.slug).toBe(first!.slug)
		expect(after!.title).toBe('Renamed')
	})

	test('replaces tags on re-sync (delete + reinsert)', async () => {
		await seedItem()
		await runWebSync(db, makeConfig(), logger)

		await db
			.updateTable('pieces_items')
			.set({ frontmatter_json: JSON.stringify({ title: 'Great Book', tags: ['updated'] }) })
			.where('id', '=', 'item-1')
			.execute()
		await runWebSync(db, makeConfig(), logger)

		const tags = await db.selectFrom('web_pieces_tags').selectAll().execute()
		expect(tags.map((t) => t.tag)).toEqual(['updated'])
	})

	test('generates unique slugs when filenames collide within type', async () => {
		await seedItem({ id: 'a', file_path: 'books/great.md' })
		await seedItem({ id: 'b', file_path: 'archive/great.md' })

		await runWebSync(db, makeConfig(), logger)

		const rows = await db.selectFrom('web_pieces').select(['id', 'slug']).orderBy('id').execute()
		expect(rows.map((r) => r.slug).sort()).toEqual(['great', 'great--1'])
	})

	test('prunes web_pieces rows whose file_path is no longer in pieces_items', async () => {
		await seedItem()
		await runWebSync(db, makeConfig(), logger)

		await db.deleteFrom('pieces_items').where('id', '=', 'item-1').execute()
		await runWebSync(db, makeConfig(), logger)

		const rows = await db.selectFrom('web_pieces').selectAll().execute()
		expect(rows).toHaveLength(0)
	})

	test('sanitizes asset paths in json_metadata to keys', async () => {
		await seedItem({
			frontmatter_json: JSON.stringify({
				title: 'X',
				cover: 'books/great/cover.png',
				tags: [],
			}),
			assets_json_array: JSON.stringify(['books/great/cover.png']),
		})

		await runWebSync(db, makeConfig(), logger)

		const row = await db.selectFrom('web_pieces').select('json_metadata').executeTakeFirst()
		const parsed = JSON.parse(row!.json_metadata)
		expect(parsed.cover).not.toBe('books/great/cover.png')
		expect(parsed.cover).toMatch(/^[a-f0-9]{64}$/)
	})

	test('skips item types not in config.pieces', async () => {
		await seedItem({ id: 'x', type: 'unknown', file_path: 'unknown/x.md' })
		await runWebSync(db, makeConfig(), logger)

		const rows = await db.selectFrom('web_pieces').selectAll().execute()
		expect(rows).toHaveLength(0)
	})

	test('logs sync start and completion', async () => {
		await runWebSync(db, makeConfig(), logger)
		expect(logger.info).toHaveBeenCalledWith('web.sync starting')
		expect(logger.info).toHaveBeenCalledWith('web.sync complete')
	})
})
