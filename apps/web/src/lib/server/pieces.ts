import {
	Pieces,
	pieceFrontMatterFromPrompt,
	type PieceFrontmatter,
	type PieceFrontmatterSchema
} from '@luzzle/core'
import { sql, type Kysely } from 'kysely'
import type { AppDatabase, WebPieces } from '@luzzle/web.db'
import { getStorage } from './storage'
import { config } from './config'

let pieces: Pieces | null = null

export function getPieces(): Pieces {
	if (pieces) {
		return pieces
	}

	const storage = getStorage()
	pieces = new Pieces(storage)

	return pieces
}

export async function promptToPiece(
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	prompt: string,
	file?: Buffer[]
) {
	if (!config.ai) {
		throw new Error('AI is not configured. Please check your config.yaml')
	}

	return pieceFrontMatterFromPrompt(config.ai.api_key, schema, prompt, file)
}

export async function getRecentPieces(
	db: Kysely<AppDatabase>,
	limit: number
): Promise<WebPieces[]> {
	return db
		.selectFrom('web_pieces')
		.selectAll()
		.orderBy('date_added', 'desc')
		.limit(limit)
		.execute()
}

export async function getRecentlyEditedPieces(
	db: Kysely<AppDatabase>,
	limit: number
): Promise<WebPieces[]> {
	return db
		.selectFrom('web_pieces')
		.selectAll()
		.orderBy(sql`COALESCE(date_updated, date_added)`, 'desc')
		.limit(limit)
		.execute()
}
