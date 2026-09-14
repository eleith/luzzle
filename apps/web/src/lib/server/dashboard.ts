import type { Kysely } from 'kysely'
import type { AppDatabase } from '@luzzle/web.db'

export interface PieceStats {
	total: number
	byType: { type: string; count: number }[]
}

export async function getPieceStats(db: Kysely<AppDatabase>): Promise<PieceStats> {
	const byType = await db
		.selectFrom('web_pieces')
		.select(['type', (eb) => eb.fn.countAll<number>().as('count')])
		.groupBy('type')
		.orderBy('type', 'asc')
		.execute()

	return {
		total: byType.reduce((sum, row) => sum + Number(row.count), 0),
		byType: byType.map((row) => ({ type: row.type, count: Number(row.count) }))
	}
}

export interface AssetStats {
	total: number
	byTransformation: { transformation: string; count: number }[]
}

export async function getAssetStats(db: Kysely<AppDatabase>): Promise<AssetStats> {
	const byTransformation = await db
		.selectFrom('web_pieces_assets')
		.select(['transformation', (eb) => eb.fn.countAll<number>().as('count')])
		.groupBy('transformation')
		.orderBy('transformation', 'asc')
		.execute()

	return {
		total: byTransformation.reduce((sum, row) => sum + Number(row.count), 0),
		byTransformation: byTransformation.map((row) => ({
			transformation: row.transformation,
			count: Number(row.count)
		}))
	}
}
