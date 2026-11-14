import { Pieces } from '@luzzle/core'
import { sql, type Kysely } from 'kysely'
import type { AppDatabase, WebPieces } from '@luzzle/web.db'
import { getStorage } from './storage'

let pieces: Pieces | null = null

export function getPieces(): Pieces {
	if (pieces) {
		return pieces
	}

	const storage = getStorage()
	pieces = new Pieces(storage)

	return pieces
}

export async function getRecentPieces(
	db: Kysely<AppDatabase>,
	limit: number,
	types: readonly string[]
): Promise<WebPieces[]> {
	if (!types.length) return []
	return db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', 'in', types)
		.orderBy('date_added', 'desc')
		.limit(limit)
		.execute()
}

export async function getRandomPieces(
	db: Kysely<AppDatabase>,
	limit: number,
	types: readonly string[],
	excludedIds: readonly string[] = []
): Promise<WebPieces[]> {
	if (!types.length) return []
	let query = db.selectFrom('web_pieces').selectAll().where('type', 'in', types)
	if (excludedIds.length) query = query.where('id', 'not in', excludedIds)
	return query
		.orderBy(sql`RANDOM()`)
		.limit(limit)
		.execute()
}

export async function getRecentlyPublishedPieces(
	db: Kysely<AppDatabase>,
	limit: number
): Promise<WebPieces[]> {
	return db
		.selectFrom('web_pieces')
		.selectAll()
		.where((eb) =>
			eb.or([eb('last_published_at', 'is not', null), eb('content_hash', 'is not', null)])
		)
		.orderBy(sql`COALESCE(last_published_at, date_updated, date_added)`, 'desc')
		.limit(limit)
		.execute()
}

export async function getRecentlyEditedPieces(
	db: Kysely<AppDatabase>,
	limit: number,
	types: readonly string[]
) {
	if (!types.length) return []
	// Web startup can precede the worker, which creates the core index tables.
	const tables = await db.introspection.getTables()
	if (
		!['pieces_items', 'pieces_cache'].every((name) => tables.some((table) => table.name === name))
	) {
		return []
	}
	return db
		.selectFrom('pieces_items')
		.innerJoin('pieces_cache', 'pieces_cache.file_path', 'pieces_items.file_path')
		.leftJoin('web_pieces', 'web_pieces.file_path', 'pieces_items.file_path')
		.select([
			'pieces_items.id',
			'pieces_items.file_path',
			'pieces_items.type',
			'pieces_items.frontmatter_json',
			'pieces_items.date_added',
			'pieces_items.date_updated',
			'web_pieces.content_hash as publishedHash',
			'web_pieces.last_published_at as publishedAt'
		])
		.where('pieces_items.type', 'in', types)
		.where((eb) =>
			eb.or([
				eb('web_pieces.content_hash', 'is', null),
				eb('pieces_cache.content_hash', '!=', eb.ref('web_pieces.content_hash'))
			])
		)
		.orderBy(sql`COALESCE(pieces_items.date_updated, pieces_items.date_added)`, 'desc')
		.orderBy('pieces_items.file_path')
		.limit(limit)
		.execute()
}

export async function getWebPiece(
	db: Kysely<AppDatabase>,
	filePath: string
): Promise<WebPieces | undefined> {
	return db
		.selectFrom('web_pieces')
		.selectAll()
		.where('file_path', '=', filePath)
		.executeTakeFirst()
}
