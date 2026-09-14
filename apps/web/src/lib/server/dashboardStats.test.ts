import { describe, expect, test } from 'vitest'
import { createAppDb, runWebMigrations } from '@luzzle/web.db'
import { getPieceStats, getAssetStats } from './dashboardStats'

async function createTestDb() {
	const db = createAppDb(':memory:')
	await runWebMigrations(db)
	return db
}

describe('getPieceStats', () => {
	test('counts pieces by type', async () => {
		const db = await createTestDb()

		await db
			.insertInto('web_pieces')
			.values([
				{
					id: '1',
					key: 'k1',
					title: 'piece one',
					slug: 's1',
					type: 'article',
					file_path: 'a.md',
					json_metadata: '{}',
					date_added: 1
				},
				{
					id: '2',
					key: 'k2',
					title: 'piece two',
					slug: 's2',
					type: 'article',
					file_path: 'b.md',
					json_metadata: '{}',
					date_added: 2
				},
				{
					id: '3',
					key: 'k3',
					title: 'piece three',
					slug: 's3',
					type: 'bookmark',
					file_path: 'c.md',
					json_metadata: '{}',
					date_added: 3
				}
			])
			.execute()

		const stats = await getPieceStats(db)

		expect(stats.total).toBe(3)
		expect(stats.byType).toEqual([
			{ type: 'article', count: 2 },
			{ type: 'bookmark', count: 1 }
		])
	})

	test('returns zero total when no pieces exist', async () => {
		const db = await createTestDb()

		const stats = await getPieceStats(db)

		expect(stats).toEqual({ total: 0, byType: [] })
	})
})

describe('getAssetStats', () => {
	test('counts only direct assets, excluding generated derivatives', async () => {
		const db = await createTestDb()

		await db
			.insertInto('web_pieces_assets')
			.values([
				{
					piece_file_path: 'a.md',
					piece_key: 'k1',
					asset_key: 'ak1',
					transformation: 'image.original',
					mime_type: 'image/png'
				},
				{
					piece_file_path: 'a.md',
					piece_key: 'k1',
					asset_key: 'ak2',
					transformation: 'attachment',
					mime_type: 'application/pdf'
				},
				{
					piece_file_path: 'a.md',
					piece_key: 'k1',
					asset_key: 'ak3',
					transformation: 'image.small.avif',
					mime_type: 'image/avif'
				},
				{
					piece_file_path: 'b.md',
					piece_key: 'k2',
					asset_key: 'ak4',
					transformation: 'opengraph',
					mime_type: 'image/png'
				}
			])
			.execute()

		const stats = await getAssetStats(db)

		expect(stats).toEqual({ total: 2 })
	})

	test('returns zero total when no assets exist', async () => {
		const db = await createTestDb()

		const stats = await getAssetStats(db)

		expect(stats).toEqual({ total: 0 })
	})
})
