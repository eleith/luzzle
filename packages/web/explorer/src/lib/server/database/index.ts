import { building } from '$app/environment'
import { config } from '$lib/server/config'
import { getDatabaseClient, sql } from '@luzzle/core'
import type { WebPieceTags, WebPieces, WebPiecesAsset } from '@luzzle/web.utils'

export type WebDatabase = {
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

export { sql, db }
