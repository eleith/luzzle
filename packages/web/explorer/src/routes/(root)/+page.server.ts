import { db, getWebPiece } from '$lib/server/database'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const latestPiece = await getWebPiece(
		db
			.selectFrom('web_pieces')
			.selectAll()
			.orderBy('date_consumed', 'desc')
			.orderBy('date_added', 'desc')
			.limit(1)
	)

	const types = await db
		.selectFrom('web_pieces')
		.select('type')
		.distinct()
		.orderBy('type', 'asc')
		.execute()

	return {
		latestPiece,
		types
	}
}
