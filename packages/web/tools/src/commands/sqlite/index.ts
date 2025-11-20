import { getDatabaseClient } from '@luzzle/core'
import {
	dropWebTables,
	createWebTables,
	populateWebPieceTags,
	populateWebPieceItems,
	populateWebPieceSearch,
} from './database.js'
import { loadConfig } from '../../lib/config/config.js'
import path from 'path'

export interface WebPieces {
	id: string
	title: string
	slug: string
	file_path: string
	note?: string
	date_updated?: number
	date_added: number
	date_consumed?: number
	type: string
	media?: string
	json_metadata: string
	summary?: string
	keywords?: string
}

export interface WebPieceTags {
	piece_slug: string
	piece_type: string
	piece_id: string
	tag: string
	slug: string
}

export default async function generateWebSqlite(configPath: string) {
	const config = loadConfig(configPath)
	const dbPath = path.join(path.dirname(configPath), config.paths.database)
	const db = getDatabaseClient(dbPath)

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
