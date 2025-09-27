import { db } from '$lib/server/database'
import { loadBlock } from '$lib/server/content'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const latestPiece =
		(await db
			.selectFrom('web_pieces')
			.selectAll()
			.orderBy('date_consumed', 'desc')
			.orderBy('date_added', 'desc')
			.limit(1)
			.executeTakeFirst()) || null

	const types = await db
		.selectFrom('web_pieces')
		.select('type')
		.distinct()
		.orderBy('type', 'asc')
		.execute()

	return {
		root_html: await loadBlock('root'),
		latestPiece,
		types
	}
}
