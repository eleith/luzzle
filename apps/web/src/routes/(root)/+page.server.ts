import { db } from '#lib/server/database/index.js'
import type { PageServerLoad } from './$types'
import { renderPieceIcons } from '#lib/pieces/icon-listing/render.server.js'
import { hydrateWithAssets } from '#lib/pieces/assets.server.js'
import { getRecentPieces, getRandomPieces } from '#lib/server/pieces.js'
import { getConfiguredPieceTypes } from '#lib/pieces/types.server.js'
import { config } from '#lib/server/config.js'
import { loadPageMarkdown } from '#lib/server/pages.js'

const HOME_PIECE_COUNT = 5

export const load: PageServerLoad = async () => {
	const types = getConfiguredPieceTypes()
	const settings = config.pages.home
	const [body, latestRows] = await Promise.all([
		loadPageMarkdown(settings.body),
		settings.latest ? getRecentPieces(db, HOME_PIECE_COUNT, types) : []
	])
	const randomRows = settings.random
		? await getRandomPieces(
				db,
				HOME_PIECE_COUNT,
				types,
				latestRows.map((piece) => piece.id)
			)
		: []
	const [latest, random] = await Promise.all([
		hydrateWithAssets(latestRows),
		hydrateWithAssets(randomRows)
	])
	const centerContent = Boolean(body) && !settings.latest && !settings.random
	// Render both collections together so a shared design contributes just one stylesheet.
	const pieces = [...latest, ...random]
	const iconRequests = pieces.map((piece) => ({ piece, size: { width: 80 }, lazy: false }))
	const icons = await renderPieceIcons(iconRequests, config)
	const cards = pieces.map((piece, index) => ({ piece, iconHtml: icons?.html[index] ?? null }))
	return {
		types,
		body,
		latest: cards.slice(0, latest.length),
		random: cards.slice(latest.length),
		iconStylesheets: icons?.stylesheets ?? [],
		centerContent
	}
}
