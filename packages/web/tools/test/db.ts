import { getDatabaseClient, LuzzleDatabase, LuzzleTables, migrate } from '@luzzle/core'
import { type WebPieces, type WebPiecesAsset, type WebPieceTags } from '@luzzle/web.utils'
import { Kysely, sql } from 'kysely'
import runWebMigrations from '../src/database/migrations.js'

type WebTables = {
	web_pieces: WebPieces
	web_pieces_assets: WebPiecesAsset
	web_pieces_tags: WebPieceTags
}

export type TestDatabase = Kysely<LuzzleTables & WebTables>

let cachedDb: LuzzleDatabase | null = null

export async function setupDatabase() {
	if (!cachedDb) {
		cachedDb = getDatabaseClient(':memory:')
		const coreResult = await migrate(cachedDb)
		if (coreResult.error) {
			throw new Error(`Core migration failed: ${coreResult.error}`)
		}
		const webResult = await runWebMigrations(cachedDb)
		if (webResult.error) {
			throw new Error(`Web migration failed: ${webResult.error}`)
		}
	}
	await sql`BEGIN`.execute(cachedDb)
	return cachedDb.withTables<WebTables>()
}

export async function teardownDatabase(db: Kysely<LuzzleTables & WebTables>) {
	await sql`ROLLBACK`.execute(db)
}
