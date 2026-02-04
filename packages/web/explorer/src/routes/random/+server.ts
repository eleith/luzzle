import { redirect } from '@sveltejs/kit'
import { db, sql } from '$lib/server/database'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async () => {
	const piece = await db
		.selectFrom('web_pieces')
		.select(['type', 'slug'])
		.orderBy(sql`RANDOM()`)
		.limit(1)
		.executeTakeFirst()

	if (piece) {
		throw redirect(302, `/pieces/${piece.type}/${piece.slug}`)
	}

	return new Response('No pieces found', { status: 404 })
}
