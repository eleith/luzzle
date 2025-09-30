import { getDatabaseClient } from '@luzzle/core'
import {
	dropWebTables,
	createWebTables,
	populateWebPieceTags,
	populateWebPieceItems,
	populateWebPieceSearch,
} from './sqlite/database.js'
import { WebPieces } from './utils/types.js'
import { loadConfig } from '../lib/config-loader.js'

export async function generateWebSqlite(configPath: string) {
	const config = loadConfig({ userConfigPath: configPath })
	const db = getDatabaseClient(config.paths.database)

	await dropWebTables(db)
	await createWebTables(db)

	await populateWebPieceItems(db, config)
	await populateWebPieceTags(db)
	await populateWebPieceSearch(db)

	const pieces = await db
		.withTables<{ web_pieces: WebPieces }>()
		.selectFrom('web_pieces')
		.selectAll()
		.execute()

	const tags = await db
		.withTables<{ web_pieces_tags: WebPieces }>()
		.selectFrom('web_pieces_tags')
		.selectAll()
		.execute()

	console.log(`${config.paths.database} has ${pieces.length} pieces and ${tags.length} tags`)
}
