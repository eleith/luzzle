import { PRIVATE_DATABASE_URL } from '$env/static/private'
import { getDatabaseClient, sql } from '@luzzle/core'
import type { WebPieces } from '$lib/pieces/types'

let db: ReturnType<typeof initalizeLuzzleDatabase>

function initalizeLuzzleDatabase() {
	return getDatabaseClient(PRIVATE_DATABASE_URL).withTables<{
		web_pieces: WebPieces
		web_pieces_fts5: WebPieces
	}>()
}

async function initializeDatabase() {
	if (!db) {
		db = initalizeLuzzleDatabase()
	}
}

function getDatabase() {
	return db
}

export { sql, getDatabase, initializeDatabase }
