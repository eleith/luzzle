import { getDatabaseClient, migrate } from '@luzzle/core'
import { Config, WebPieces, WebPiecesAsset, WebPieceTags } from '@luzzle/web.config'
import path from 'path'

export type WebTables = {
	web_pieces: WebPieces
	web_pieces_assets: WebPiecesAsset
	web_pieces_tags: WebPieceTags
}

export function getDatabase(config: Config) {
	if (!config.paths.config) {
		throw new Error('Config path is missing. Database cannot be resolved.')
	}

	const dbPath = path.resolve(path.dirname(config.paths.config), config.paths.database)
	return getDatabaseClient(dbPath)
}

export async function getDatabaseAndMigrate(config: Config) {
	const db = getDatabase(config)

	const migrationStatus = await migrate(db)

	if (migrationStatus.error) {
		throw new Error(`Migration failed: ${migrationStatus.error}`)
	}

	return db
}
