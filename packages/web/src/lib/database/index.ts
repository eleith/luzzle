import { PRIVATE_DATABASE_URL } from '$env/static/private'
import { getDatabaseClient } from '@luzzle/core'
import type { WebPieces } from '$lib/pieces/types'

let db: ReturnType<typeof initalizeLuzzleDatabase>

function initalizeLuzzleDatabase() {
	return getDatabaseClient(PRIVATE_DATABASE_URL).withTables<{
		web_pieces: WebPieces
		web_pieces_fts5: WebPieces
	}>()
}

export async function initializeDatabase() {
	if (!db) {
		db = initalizeLuzzleDatabase()
	}
}

export function getDatabase() {
	return db
}
