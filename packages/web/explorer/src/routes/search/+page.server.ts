import { getDatabase } from '$lib/database'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { sql } from '@luzzle/core'

const MAX_RESULTS = 20

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('query')
	const pageParam = url.searchParams.get('page') || '1'
	const pageNumber = parseInt(pageParam) || null
	const db = getDatabase()

	let select = db.selectFrom('web_pieces_fts5').selectAll()

	if (pageNumber === null || pageNumber < 1) {
		redirect(302, url.pathname)
	}

	if (query) {
		const escapedQuery = `"${query.replace(/"/g, '""')}"`
		select = select.where(sql`web_pieces_fts5`, sql`match`, escapedQuery)
	} else {
		redirect(302, '/')
	}

	const pieces = await select
		.orderBy(sql`bm25(web_pieces_fts5, 1, 1, 1, 10, 3, 2, 1, 3, 3, 1, 1, 1)`)
		.offset((pageNumber - 1) * MAX_RESULTS)
		.limit(MAX_RESULTS + 1)
		.execute()

	if (pieces.length === 0 && pageNumber > 1) {
		redirect(302, url.pathname)
	}

	if (pieces.length === MAX_RESULTS + 1) {
		pieces.pop()
	}

	return {
		pieces,
		query,
		nextPage: pieces.length === MAX_RESULTS ? pageNumber + 1 : null
	}
}
