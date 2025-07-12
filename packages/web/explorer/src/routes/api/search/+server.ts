import { json, type RequestHandler } from '@sveltejs/kit'
import { getDatabase, sql } from '$lib/database'

const MAX_RESULTS = 20

export const GET: RequestHandler = async ({ request }) => {
	const url = new URL(request.url)
	const page = url.searchParams.get('page') || '1'
	const query = url.searchParams.get('query')
	const pageParseInt = parseInt(page)
	const pageNumber = isNaN(pageParseInt) ? 1 : pageParseInt
	const db = getDatabase()

	if (pageNumber < 1) {
		return new Response('no pieces for this page', { status: 404 })
	}

	if (!query || query.length < 3) {
		return new Response('query must be at least 3 characters long', { status: 400 })
	}

	const escapedQuery = `"${query.replace(/"/g, '""')}"`
	const pieces = await db
		.selectFrom('web_pieces_fts5')
		.selectAll()
		.where(sql`web_pieces_fts5`, sql`match`, escapedQuery)
		.orderBy(sql`bm25(web_pieces_fts5, 1, 1, 1, 10, 3, 2, 1, 3, 3, 1, 1, 1)`)
		.offset((pageNumber - 1) * MAX_RESULTS)
		.limit(MAX_RESULTS)
		.execute()

	if (pieces.length === 0) {
		return new Response('no pieces found for this query', { status: 404 })
	}

	return json({
		pieces
	})
}
