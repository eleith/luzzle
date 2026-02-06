import {
	dropWebTables,
	createWebTables,
	populateWebPieceTags,
	populateWebPieceItems,
	populateWebPieceSearch,
} from './database.js'
import { Config, type WebPieces } from '@luzzle/web.utils'
import { getDatabase } from '../../lib/database.js'

export default async function generateWebSqlite(config: Config) {
	const db = getDatabase(config)
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
