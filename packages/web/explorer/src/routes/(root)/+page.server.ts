import { getDatabase } from '$lib/database'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const db = getDatabase()

	const types = await db.selectFrom('web_pieces').select('type').groupBy('type').execute()

	const latest = await db
		.selectFrom('web_pieces')
		.selectAll()
		.orderBy('date_consumed', 'desc')
		.limit(4)
		.execute()

	return {
		types,
		latest
	}
}
