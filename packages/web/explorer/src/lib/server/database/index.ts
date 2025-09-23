import { building } from '$app/environment'
import { config } from '$lib/server/config'
import { getDatabaseClient, sql } from '@luzzle/core'
import type { WebPieceTags, WebPieces } from '$lib/pieces/types'

function initializeDatabase() {
	const dbPath = building ? ':memory:' : config.paths.database
	return getDatabaseClient(dbPath).withTables<{
		web_pieces: WebPieces
		web_pieces_fts5: WebPieces
		web_pieces_tags: WebPieceTags
	}>()
}

const db = initializeDatabase()

export { sql, db }
