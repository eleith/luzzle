import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'

export const GET: RequestHandler = async (a) => {
	const piece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', a.params.piece)
		.where('slug', '=', a.params.slug)
		.executeTakeFirst()

	if (!piece) {
		return new Response('piece not found', {
			status: 404
		})
	}

	throw redirect(302, `/editor/piece/${piece.file_path}/source`)
}
