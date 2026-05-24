import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'

export const GET: RequestHandler = async ({ params }) => {
	const piece = await db
		.selectFrom('web_pieces')
		.select('file_path')
		.where('type', '=', params.piece)
		.where('slug', '=', params.slug)
		.executeTakeFirst()

	if (!piece) {
		return new Response('piece not found', { status: 404 })
	}

	throw redirect(302, `/editor/piece/${piece.file_path}/source`)
}
