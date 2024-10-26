import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/database'
import { addFrontMatter } from '@luzzle/core'

export const GET: RequestHandler = async (a) => {
	const type = a.params.piece
	const slug = a.params.slug
	const db = getDatabase()
	const contentType = 'text/markdown'

	const piece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!piece) {
		return new Response('piece not found', { headers: { 'content-type': contentType }, status: 404 })
	}

	const metadata = JSON.parse(piece.json_metadata)

	delete metadata.slug
	delete metadata.id
	delete metadata.note
	delete metadata.date_added
	delete metadata.date_updated

	const body = addFrontMatter(piece.note, metadata)

	return new Response(body, { headers: { 'content-type': contentType } })
}

export const prerender = true
