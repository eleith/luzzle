import { building } from '$app/environment'
import { config } from '$lib/server/config'
import { getDatabaseClient, sql } from '@luzzle/core'
import type { WebPieceTags, WebPieces, WebPiecesAsset } from '@luzzle/web.utils'
import type { WebPiece } from '$lib/pieces/types'
import type { SelectQueryBuilder } from 'kysely'

type WebDatabase = {
	web_pieces: WebPieces
	web_pieces_fts5: WebPieces
	web_pieces_tags: WebPieceTags
	web_pieces_assets: WebPiecesAsset
}

function initializeDatabase() {
	const dbPath = building ? ':memory:' : config.paths.database
	return getDatabaseClient(dbPath).withTables<WebDatabase>()
}

const db = initializeDatabase()

export async function getWebPieces(
	query: SelectQueryBuilder<WebDatabase, 'web_pieces', WebPieces>
): Promise<WebPiece[]> {
	const pieces = await query.execute()
	if (pieces.length === 0) return []

	const paths = pieces.map((p) => p.file_path)
	const assets = await db
		.selectFrom('web_pieces_assets')
		.selectAll()
		.where('piece_file_path', 'in', paths)
		.execute()

	const assetMap = new Map<string, WebPiecesAsset[]>()
	for (const asset of assets) {
		const list = assetMap.get(asset.piece_file_path) || []
		list.push(asset)
		assetMap.set(asset.piece_file_path, list)
	}

	return pieces.map((p) => ({
		...p,
		assets: assetMap.get(p.file_path) || []
	}))
}

export async function getWebPiece(
	query: SelectQueryBuilder<WebDatabase, 'web_pieces', WebPieces>
): Promise<WebPiece | null> {
	const piece = await query.executeTakeFirst()
	if (!piece) return null

	const assets = await db
		.selectFrom('web_pieces_assets')
		.selectAll()
		.where('piece_file_path', '=', piece.file_path)
		.execute()

	return {
		...piece,
		assets
	}
}

export { sql, db }
