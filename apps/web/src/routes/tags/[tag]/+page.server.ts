import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { selectTaggedPieces } from '#lib/server/load/tagged-pieces.js'
import { config } from '#lib/server/config.js'
import { hydrateWithAssets } from '#lib/pieces/assets.server.js'
import { renderPieceIcons } from '#lib/pieces/icon-listing/render.server.js'

const PAGE_SIZE = 50

export const load = (async ({ params: { tag }, url }) => {
	const pageParam = url.searchParams.get('page') ?? '1'
	const page = Number(pageParam)
	const offset = (page - 1) * PAGE_SIZE
	if (!/^\d+$/.test(pageParam) || page < 1 || !Number.isSafeInteger(offset)) {
		redirect(302, url.pathname)
	}

	const rows = await selectTaggedPieces(tag)
		.orderBy('date_consumed', 'desc')
		.orderBy('date_added', 'desc')
		.orderBy('id', 'asc')
		.offset(offset)
		.limit(PAGE_SIZE + 1)
		.execute()

	if (!rows.length) {
		if (page > 1) redirect(302, url.pathname)
		error(404, 'tag not found')
	}

	const nextPage = rows.length > PAGE_SIZE ? page + 1 : null
	const pieces = await hydrateWithAssets(rows.slice(0, PAGE_SIZE))
	const externalIcons = await renderPieceIcons(
		pieces.map((piece, index) => ({ piece, size: { width: 125 }, lazy: index >= 5 })),
		config
	)
	return { tag, page, nextPage, pieces, externalIcons }
}) satisfies PageServerLoad
