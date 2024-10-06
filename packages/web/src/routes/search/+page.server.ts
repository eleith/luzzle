import { getDatabase } from '$lib/database'
import type { PageServerLoad } from './$types'
import { sql } from '@luzzle/core'

const MAX_RESULTS = 20

export const load: PageServerLoad = async (event) => {
	const searchQuery = event.url.searchParams.get('query')
	const db = getDatabase()

	let piecesQuery = db.selectFrom('web_pieces_fts5').selectAll()

	if (searchQuery) {
		piecesQuery = piecesQuery.where(sql`web_pieces_fts5`, sql`match`, searchQuery)
	}

	const pieces = await piecesQuery
		.orderBy(sql`bm25(web_pieces_fts5, 1, 1, 1, 10, 3, 2, 1, 3, 3, 1, 1, 1)`)
		.limit(MAX_RESULTS)
		.execute()

	return {
		pieces
	}
}
