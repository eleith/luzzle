import { error, redirect } from '@sveltejs/kit'
import { isConfiguredPieceType } from '$lib/pieces/types.server.js'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'

export const GET: RequestHandler = async ({ params }) => {
	if (!isConfiguredPieceType(params.piece)) {
		error(404, 'piece type not found')
	}

	const piece = await db
		.selectFrom('web_pieces')
		.select('file_path')
		.where('type', '=', params.piece)
		.where('slug', '=', params.slug)
		.executeTakeFirst()

	if (!piece) {
		return new Response('piece not found', { status: 404 })
	}

	throw redirect(302, `/admin/piece/${piece.file_path}/source`)
}
