import { db } from '$lib/server/database'
import type { PageServerLoad } from './$types'
import { hydrateWithAssets } from '$lib/pieces/assets.server'

export const load: PageServerLoad = async () => {
	const typesData = await db
		.selectFrom('web_pieces')
		.select('type')
		.distinct()
		.orderBy('type', 'asc')
		.execute()

	const types = typesData.map((t) => t.type)

	const pieces = await hydrateWithAssets(
		await db
			.selectFrom('web_pieces')
			.selectAll()
			.orderBy('date_added', 'desc')
			.limit(5)
			.execute()
	)

	return {
		types,
		pieces
	}
}
