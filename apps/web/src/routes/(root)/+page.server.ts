import { db } from '$lib/server/database'
import type { PageServerLoad } from './$types'
import { hydrateWithAssets } from '$lib/pieces/assets.server'
import { getRecentPieces, getRandomPieces } from '$lib/server/pieces'
import { getConfiguredPieceTypes } from '$lib/pieces/types.server.js'
import { config } from '$lib/server/config'
import { loadPageMarkdown } from '$lib/server/pages.js'

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
	return { types, body, latest, random }
}
