import { building } from '$app/environment'
import { config } from '$lib/server/config'
import { getDatabaseClient, sql } from '@luzzle/core'
import { runWebMigrations } from './migrations.js'
import type { WebPieceTags, WebPieces, WebPiecesAsset } from '$lib/pieces/types'

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

if (!building) {
	const result = await runWebMigrations(db)
	if (result.error) {
		throw new Error(`Web migrations failed: ${result.error}`)
	}
}

export { sql, db }
