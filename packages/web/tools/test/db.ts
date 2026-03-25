import { getDatabaseClient, LuzzleDatabase, migrate } from '@luzzle/core'
import { type WebPieces, type WebPiecesAsset, type WebPieceTags } from '@luzzle/web.utils'
import { sql } from 'kysely'
import runWebMigrations from '../src/database/migrations.js'

export type WebTables = { web_pieces: WebPieces; web_pieces_assets: WebPiecesAsset; web_pieces_tags: WebPieceTags }

export async function setupTestDb() {
	const db = getDatabaseClient(':memory:')
	const coreResult = await migrate(db)
	if (coreResult.error) {
		throw new Error(`Core migration failed: ${coreResult.error}`)
	}
	const webResult = await runWebMigrations(db)
	if (webResult.error) {
		throw new Error(`Web migration failed: ${webResult.error}`)
	}
	return db
}

export function withWebTables(db: LuzzleDatabase) {
	return db.withTables<WebTables>()
}

export async function beginTransaction(db: LuzzleDatabase) {
	await sql`BEGIN`.execute(db)
}

export async function rollbackTransaction(db: LuzzleDatabase) {
	await sql`ROLLBACK`.execute(db)
}
