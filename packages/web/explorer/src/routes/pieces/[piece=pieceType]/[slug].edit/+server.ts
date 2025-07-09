import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/database'
import { PRIVATE_LUZZLE_EDITOR_URL } from '$env/static/private'

export const GET: RequestHandler = async (a) => {
	const db = getDatabase()
	const contentType = 'text/markdown'

	const piece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', a.params.piece)
		.where('slug', '=', a.params.slug)
		.executeTakeFirst()

	if (!piece) {
		return new Response('piece not found', {
			headers: { 'content-type': contentType },
			status: 404
		})
	} else {
		return Response.redirect(`${PRIVATE_LUZZLE_EDITOR_URL}/${piece.file_path}`, 302)
	}
}
