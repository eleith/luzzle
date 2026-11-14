import { describe, expect, test, vi } from 'vitest'
import { createAppDb, runWebMigrations } from '@luzzle/web.db'
import { asCoreDatabase, migrate } from '@luzzle/core'
import { sql } from 'kysely'
import {
	getWebPiece,
	getRecentlyPublishedPieces,
	getRecentlyEditedPieces,
	getRecentPieces,
	getRandomPieces
} from './pieces.js'

// pieces.js pulls in getPieces()'s module-level dependencies on import
vi.mock('#lib/server/config.js', () => ({ config: {} }))
vi.mock('#lib/server/storage.js', () => ({ getStorage: vi.fn() }))

async function createTestDb() {
	const db = createAppDb(':memory:')
	await runWebMigrations(db)
	return db
}

describe('getRecentlyPublishedPieces', () => {
	test('orders by publication time, falling back to update or creation dates for older rows', async () => {
		const db = await createTestDb()

		await db
			.insertInto('web_pieces')
			.values([
				{
					id: 'a',
					key: 'ka',
					title: 'piece a',
					slug: 'a',
					type: 'article',
					file_path: 'a.md',
					json_metadata: '{}',
					date_added: 500,
					date_updated: 100,
					content_hash: 'legacy-hash'
				},
				{
					id: 'b',
					key: 'kb',
					title: 'piece b',
					slug: 'b',
					type: 'article',
					file_path: 'b.md',
					json_metadata: '{}',
					date_added: 50,
					date_updated: 60,
					last_published_at: 300
				},
				{
					id: 'c',
					key: 'kc',
					title: 'piece c',
					slug: 'c',
					type: 'article',
					file_path: 'c.md',
					json_metadata: '{}',
					date_added: 200,
					content_hash: 'legacy-hash'
				}
			])
			.execute()

		const pieces = await getRecentlyPublishedPieces(db, 5)

		expect(pieces.map((p) => p.id)).toEqual(['b', 'c', 'a'])
	})

	test('respects the limit', async () => {
		const db = await createTestDb()

		await db
			.insertInto('web_pieces')
			.values([
				{
					id: 'a',
					key: 'ka',
					title: 'piece a',
					slug: 'a',
					type: 'article',
					file_path: 'a.md',
					json_metadata: '{}',
					date_added: 1,
					content_hash: 'published-hash'
				},
				{
					id: 'b',
					key: 'kb',
					title: 'piece b',
					slug: 'b',
					type: 'article',
					file_path: 'b.md',
					json_metadata: '{}',
					date_added: 2,
					content_hash: 'published-hash'
				}
			])
			.execute()

		const pieces = await getRecentlyPublishedPieces(db, 1)

		expect(pieces).toHaveLength(1)
		expect(pieces[0].id).toBe('b')
	})
})

describe('unpublished dashboard edits', () => {
	test('returns an empty list before the worker initializes the source index', async () => {
		const db = await createTestDb()
		try {
			expect(await getRecentlyEditedPieces(db, 5, ['article'])).toEqual([])
		} finally {
			await db.destroy()
		}
	})

	// A real join must distinguish drafts from changed publications without relying on timestamps.
	test('lists indexed drafts and changed sources, then removes published or reverted changes', async () => {
		const db = await createTestDb()
		try {
			const migration = await migrate(asCoreDatabase(db))
			if (migration.error) throw migration.error
			const sources = [
				{ id: 'draft', date_added: 500, date_updated: undefined },
				{ id: 'changed', date_added: 100, date_updated: 600 },
				{ id: 'matching', date_added: 100, date_updated: 900 },
				{ id: 'unfinished', date_added: 100, date_updated: 400 },
				{ id: 'first-failure', date_added: 100, date_updated: 350 },
				{ id: 'unindexed', date_added: 100, date_updated: 1000 },
				{ id: 'unconfigured', date_added: 100, date_updated: 1100 }
			]
			await db
				.insertInto('pieces_items')
				.values(
					sources.map((source) => ({
						id: source.id,
						file_path: `${source.id}.article.md`,
						type: source.id === 'unconfigured' ? 'other' : 'article',
						frontmatter_json: '{"title":"Source title"}',
						note_markdown: ''
					}))
				)
				.execute()
			// Core timestamps are database-owned; set historical fixture dates explicitly.
			for (const source of sources) {
				await sql`UPDATE pieces_items SET date_added = ${source.date_added},
					date_updated = ${source.date_updated ?? null} WHERE id = ${source.id}`.execute(db)
			}
			await db
				.insertInto('pieces_cache')
				.values(
					sources
						.filter((source) => source.id !== 'unindexed')
						.map(({ id }) => ({
							id,
							file_path: `${id}.article.md`,
							content_hash: `current:${id}`
						}))
				)
				.execute()
			await db
				.insertInto('web_pieces')
				.values(
					['changed', 'matching', 'unfinished', 'first-failure'].map((id) => ({
						id: `published:${id}`,
						key: id,
						slug: id,
						file_path: `${id}.article.md`,
						type: 'article',
						title: 'Published title',
						json_metadata: '{}',
						date_added: 100,
						date_updated: 2000,
						last_published_at: id === 'first-failure' ? null : 2000,
						content_hash: ['unfinished', 'first-failure'].includes(id)
							? null
							: id === 'matching'
								? `current:${id}`
								: 'old'
					}))
				)
				.execute()

			const edits = await getRecentlyEditedPieces(db, 5, ['article'])
			expect(edits.map((piece) => [piece.id, piece.publishedAt, piece.publishedHash])).toEqual([
				['changed', 2000, 'old'],
				['draft', null, null],
				['unfinished', 2000, null],
				['first-failure', null, null]
			])
			expect((await getRecentlyEditedPieces(db, 1, ['article'])).map((piece) => piece.id)).toEqual([
				'changed'
			])
			expect(await getRecentlyEditedPieces(db, 5, [])).toEqual([])
			// Failed republishes retain the prior publication; a first failure isn't a publication.
			const published = (await getRecentlyPublishedPieces(db, 5)).map((piece) => piece.file_path)
			expect(published).toContain('changed.article.md')
			expect(published).toContain('unfinished.article.md')
			expect(published).not.toContain('first-failure.article.md')

			await db
				.updateTable('web_pieces')
				.set({ content_hash: 'current:changed' })
				.where('id', '=', 'published:changed')
				.execute()
			await db
				.updateTable('web_pieces')
				.set({ content_hash: 'current:unfinished' })
				.where('id', '=', 'published:unfinished')
				.execute()
			// Editing matching content makes it pending; restoring the published bytes removes it again.
			await db
				.updateTable('pieces_cache')
				.set({ content_hash: 'edited' })
				.where('id', '=', 'matching')
				.execute()
			expect((await getRecentlyEditedPieces(db, 5, ['article'])).map((piece) => piece.id)).toEqual([
				'matching',
				'draft',
				'first-failure'
			])
			await db
				.updateTable('pieces_cache')
				.set({ content_hash: 'current:matching' })
				.where('id', '=', 'matching')
				.execute()
			expect((await getRecentlyEditedPieces(db, 5, ['article'])).map((piece) => piece.id)).toEqual([
				'draft',
				'first-failure'
			])
		} finally {
			await db.destroy()
		}
	})
})

describe('public home collections', () => {
	test('latest and random stay inside configured types and random excludes latest IDs', async () => {
		const db = await createTestDb()
		try {
			await db
				.insertInto('web_pieces')
				.values([
					{
						id: 'a',
						key: 'ka',
						title: 'A',
						slug: 'a',
						type: 'inventory',
						file_path: 'a.md',
						json_metadata: '{}',
						date_added: 3
					},
					{
						id: 'b',
						key: 'kb',
						title: 'B',
						slug: 'b',
						type: 'inventory',
						file_path: 'b.md',
						json_metadata: '{}',
						date_added: 2
					},
					{
						id: 'orphan',
						key: 'ko',
						title: 'Hidden',
						slug: 'orphan',
						type: 'unconfigured',
						file_path: 'orphan.md',
						json_metadata: '{}',
						date_added: 4
					}
				])
				.execute()
			expect((await getRecentPieces(db, 1, ['inventory'])).map((piece) => piece.id)).toEqual(['a'])
			expect((await getRandomPieces(db, 5, ['inventory'], ['a'])).map((piece) => piece.id)).toEqual(
				['b']
			)
			expect(await getRecentPieces(db, 5, [])).toEqual([])
			expect(await getRandomPieces(db, 5, [])).toEqual([])
		} finally {
			await db.destroy()
		}
	})
})

describe('getWebPiece', () => {
	test('is undefined when there is no web_pieces row', async () => {
		const db = await createTestDb()

		const piece = await getWebPiece(db, 'missing.md')

		expect(piece).toBeUndefined()
	})

	test('returns the web_pieces row for a published piece', async () => {
		const db = await createTestDb()
		await db
			.insertInto('web_pieces')
			.values({
				id: 'a',
				key: 'ka',
				title: 'piece a',
				slug: 'a',
				type: 'article',
				file_path: 'a.md',
				json_metadata: '{}',
				date_added: 100,
				date_updated: 200
			})
			.execute()

		const piece = await getWebPiece(db, 'a.md')

		expect(piece?.id).toBe('a')
		expect(piece?.date_updated).toBe(200)
	})
})
