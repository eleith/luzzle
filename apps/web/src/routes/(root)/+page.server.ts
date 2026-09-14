import { db } from '$lib/server/database'
import type { PageServerLoad } from './$types'
import { hydrateWithAssets } from '$lib/pieces/assets.server'
import { getRecentPieces } from '$lib/server/pieces'

export const load: PageServerLoad = async () => {
	const typesData = await db
		.selectFrom('web_pieces')
		.select('type')
		.distinct()
		.orderBy('type', 'asc')
		.execute()

	const types = typesData.map((t) => t.type)

	const pieces = await hydrateWithAssets(await getRecentPieces(db, 5))

	return {
		types,
		pieces
	}
}
