import { building } from '$app/environment'
import { config } from '$lib/server/config'
import { getDatabaseClient, sql } from '@luzzle/core'
import type { WebPieceTags, WebPieces, WebPiecesAsset } from '@luzzle/web.utils'

function initializeDatabase() {
	const dbPath = building ? ':memory:' : config.paths.database
	return getDatabaseClient(dbPath).withTables<{
		web_pieces: WebPieces
		web_pieces_fts5: WebPieces
		web_pieces_tags: WebPieceTags
		web_pieces_assets: WebPiecesAsset
	}>()
}

const db = initializeDatabase()

import type { WebPiece } from '$lib/pieces/types'

type WebPiecesJoinedRow = WebPieces & {
	asset_name: string | null
	transformation: string | null
	asset_path: string | null
	mime_type: string | null
	is_embedded: number | boolean | null
	cached_content: string | null
}

export function mapRowsToWebPieces(rows: WebPiecesJoinedRow[]): WebPiece[] {
	const piecesMap = new Map<string, WebPiece>()

	for (const row of rows) {
		let piece = piecesMap.get(row.id)
		if (!piece) {
			piece = {
				id: row.id,
				key: row.key,
				title: row.title,
				slug: row.slug,
				file_path: row.file_path,
				note: row.note,
				date_updated: row.date_updated,
				date_added: row.date_added,
				date_consumed: row.date_consumed,
				type: row.type,
				media: row.media,
				json_metadata: row.json_metadata,
				summary: row.summary,
				keywords: row.keywords,
				assets: []
			}
			piecesMap.set(row.id, piece)
		}

		if (row.asset_name) {
			piece.assets.push({
				piece_file_path: row.file_path,
				piece_key: row.key,
				asset_name: row.asset_name,
				transformation: row.transformation as string,
				asset_path: row.asset_path as string,
				mime_type: row.mime_type as string,
				is_embedded: !!row.is_embedded,
				cached_content: row.cached_content
			})
		}
	}

	return Array.from(piecesMap.values())
}

export { sql, db }
