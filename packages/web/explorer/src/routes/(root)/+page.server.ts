import { getDatabase } from '$lib/database'
import type { WebPieces } from '$lib/pieces/types'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const db = getDatabase()

	const types = await db.selectFrom('web_pieces').select('type').groupBy('type').execute()

	const latestPiece: WebPieces | null =
		(await db
			.selectFrom('web_pieces')
			.selectAll()
			.orderBy('date_consumed', 'desc')
			.orderBy('date_added', 'desc')
			.limit(1)
			.executeTakeFirst()) || null

	return {
		types,
		latestPiece: latestPiece
	}
}
