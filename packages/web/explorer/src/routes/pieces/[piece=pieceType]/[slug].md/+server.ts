import type { RequestHandler } from './$types'
import { getDatabase } from '$lib/database'
import { addFrontMatter } from '@luzzle/core'

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
	}

	const metadata = JSON.parse(piece.json_metadata)
	const nonMetadata = ['slug', 'id', 'note', 'date_added', 'date_updated']
	const metadataValid = Object.fromEntries(
		Object.entries(metadata).filter(
			([key, value]) => (value !== null || value === '') && !nonMetadata.includes(key)
		)
	)

	const body = addFrontMatter(piece.note, metadataValid)

	return new Response(body, { headers: { 'content-type': contentType } })
}

export const prerender = true
