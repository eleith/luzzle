import { describe, expect, test, vi } from 'vitest'
import { createAppDb, runWebMigrations } from '@luzzle/web.db'
import { getRecentlyEditedPieces } from './pieces.js'

// pieces.js pulls in getPieces()/promptToPiece()'s module-level deps on import
vi.mock('$lib/server/config', () => ({ config: {} }))
vi.mock('$lib/server/storage', () => ({ getStorage: vi.fn() }))

async function createTestDb() {
	const db = createAppDb(':memory:')
	await runWebMigrations(db)
	return db
}

describe('getRecentlyEditedPieces', () => {
	test('orders by date_updated, falling back to date_added when unset', async () => {
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
					date_added: 100
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
					date_updated: 300
				},
				{
					id: 'c',
					key: 'kc',
					title: 'piece c',
					slug: 'c',
					type: 'article',
					file_path: 'c.md',
					json_metadata: '{}',
					date_added: 200
				}
			])
			.execute()

		const pieces = await getRecentlyEditedPieces(db, 5)

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
					date_added: 1
				},
				{
					id: 'b',
					key: 'kb',
					title: 'piece b',
					slug: 'b',
					type: 'article',
					file_path: 'b.md',
					json_metadata: '{}',
					date_added: 2
				}
			])
			.execute()

		const pieces = await getRecentlyEditedPieces(db, 1)

		expect(pieces).toHaveLength(1)
		expect(pieces[0].id).toBe('b')
	})
})
