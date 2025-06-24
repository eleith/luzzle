import { PRIVATE_DATABASE_URL } from '$env/static/private'
import { getDatabaseClient, sql } from '@luzzle/core'
import type { WebPieceTags, WebPieces } from '$lib/pieces/types'

let db: ReturnType<typeof initalizeLuzzleDatabase>

function initalizeLuzzleDatabase() {
	return getDatabaseClient(PRIVATE_DATABASE_URL).withTables<{
		web_pieces: WebPieces
		web_pieces_fts5: WebPieces
		web_pieces_tags: WebPieceTags
	}>()
}

async function initializeDatabase() {
	if (!db) {
		db = initalizeLuzzleDatabase()
	}

	return db
}

function getDatabase() {
	return db
}

export { sql, getDatabase, initializeDatabase }
