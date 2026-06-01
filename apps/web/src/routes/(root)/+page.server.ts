import { db } from '$lib/server/database'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const types = await db
		.selectFrom('web_pieces')
		.select('type')
		.distinct()
		.orderBy('type', 'asc')
		.execute()

	return {
		types
	}
}
