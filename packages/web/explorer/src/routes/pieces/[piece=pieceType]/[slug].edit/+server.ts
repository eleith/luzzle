import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'

export const GET: RequestHandler = async (a) => {
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
		return Response.redirect(new URL(`/editor/piece/${piece.file_path}`, a.url).toString(), 302)
	}
}
