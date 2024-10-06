import { getDatabase } from '$lib/database'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const db = getDatabase()

	const pieces = await db
		.selectFrom('web_pieces')
		.selectAll()
		.select(db.fn.max('date_consumed').as('date_consumed'))
		.orderBy('date_consumed', 'desc')
		.groupBy('type')
		.execute()

	return {
		pieces
	}
}

export const prerender = true
