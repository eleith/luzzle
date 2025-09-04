import { getDatabase } from '$lib/database'
import type { PageServerLoad } from './$types'
import { sql } from '@luzzle/core'

const MAX_RESULTS = 20

export const load: PageServerLoad = async (event) => {
	const query = event.url.searchParams.get('query')
	const db = getDatabase()

	let select = db.selectFrom('web_pieces_fts5').selectAll()

	if (query) {
		const escapedQuery = `"${query.replace(/"/g, '""')}"`
		select = select.where(sql`web_pieces_fts5`, sql`match`, escapedQuery)
	}

	const pieces = await select
		.orderBy(sql`bm25(web_pieces_fts5, 1, 1, 1, 10, 3, 2, 1, 3, 3, 1, 1, 1)`)
		.limit(MAX_RESULTS + 1)
		.execute()

	if (pieces.length === MAX_RESULTS + 1) {
		pieces.pop()
	}

	return {
		pieces,
		query,
		nextPage: pieces.length === MAX_RESULTS ? 2 : null,
	}
}
