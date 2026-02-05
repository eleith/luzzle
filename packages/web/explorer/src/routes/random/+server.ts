import { redirect } from '@sveltejs/kit'
import { db, sql } from '$lib/server/database'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url }) => {
	let type = url.searchParams.get('type')

	if (!type) {
		const result = await db
			.selectFrom('web_pieces')
			.select('type')
			.distinct()
			.orderBy(sql`RANDOM()`)
			.limit(1)
			.executeTakeFirst()

		type = result?.type ?? null
	}

	if (!type) {
		return new Response('No pieces found', { status: 404 })
	}

	const piece = await db
		.selectFrom('web_pieces')
		.select(['type', 'slug'])
		.where('type', '=', type)
		.orderBy(sql`RANDOM()`)
		.limit(1)
		.executeTakeFirst()

	if (piece) {
		throw redirect(302, `/pieces/${piece.type}/${piece.slug}`)
	}

	return new Response('No pieces found', { status: 404 })
}
