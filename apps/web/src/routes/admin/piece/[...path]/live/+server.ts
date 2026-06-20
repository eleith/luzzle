import { error, redirect } from '@sveltejs/kit'
import { db } from '$lib/server/database'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params }) => {
	const piece = await db
		.selectFrom('web_pieces')
		.select(['type', 'slug'])
		.where('file_path', '=', params.path)
		.executeTakeFirst()

	if (!piece) {
		error(404, 'piece is not published')
	}

	redirect(302, `/pieces/${piece.type}/${piece.slug}`)
}
