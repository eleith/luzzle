import { db, sql } from '#lib/server/database/index.js'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { hydrateWithAssets } from '#lib/pieces/assets.server.js'
import { renderIconListing } from '#lib/pieces/icon-listing/render.server.js'
import { config } from '#lib/server/config.js'
import { getConfiguredPieceTypes } from '#lib/pieces/types.server.js'

const MAX_RESULTS = 20

function redirectToFirstPage(url: URL): never {
	const firstPage = new URL(url)
	firstPage.searchParams.delete('page')
	redirect(302, firstPage.pathname + firstPage.search)
}

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('query') || ''
	const type = url.searchParams.get('type') || ''
	const after = url.searchParams.get('after') || ''
	const before = url.searchParams.get('before') || ''
	const pageParam = url.searchParams.get('page') ?? '1'
	const pageNumber = Number(pageParam)
	const offset = (pageNumber - 1) * MAX_RESULTS

	if (!/^\d+$/.test(pageParam) || pageNumber < 1 || !Number.isSafeInteger(offset)) {
		redirectToFirstPage(url)
	}

	if (!query && !type && !after && !before) {
		return { pieces: [], externalIcons: undefined, query, type, after, before, nextPage: null }
	}

	let piecesQuery = db
		.selectFrom('web_pieces_fts5')
		.selectAll()
		.where('type', 'in', getConfiguredPieceTypes())

	if (query) {
		const escapedQuery = `"${query.replace(/"/g, '""')}"`
		piecesQuery = piecesQuery
			.where(sql`web_pieces_fts5`, sql`match`, escapedQuery)
			.orderBy(sql`bm25(web_pieces_fts5, 1, 1, 1, 10, 3, 2, 1, 3, 3, 1, 1, 1)`)
	} else {
		piecesQuery = piecesQuery.orderBy('date_consumed', 'desc').orderBy('date_added', 'desc')
	}

	if (type) {
		piecesQuery = piecesQuery.where('type', '=', type)
	}

	if (after) {
		const afterMs = new Date(`${after}T00:00:00Z`).getTime()
		if (!isNaN(afterMs)) {
			piecesQuery = piecesQuery.where('date_consumed', '>=', afterMs)
		}
	}

	if (before) {
		const beforeMs = new Date(`${before}T23:59:59Z`).getTime()
		if (!isNaN(beforeMs)) {
			piecesQuery = piecesQuery.where('date_consumed', '<=', beforeMs)
		}
	}

	const webPieces = await piecesQuery
		.offset(offset)
		.limit(MAX_RESULTS + 1)
		.execute()

	if (webPieces.length === 0 && pageNumber > 1) {
		redirectToFirstPage(url)
	}

	const hasMore = webPieces.length === MAX_RESULTS + 1
	if (hasMore) {
		webPieces.pop()
	}

	const pieces = await hydrateWithAssets(webPieces)

	return {
		pieces,
		externalIcons: await renderIconListing(pieces, config),
		query,
		type,
		after,
		before,
		nextPage: hasMore ? pageNumber + 1 : null
	}
}
