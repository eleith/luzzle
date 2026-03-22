import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database'
import { processMarkdown } from '$lib/server/markdown'
import { getFrontmatterValues } from '@luzzle/core'

export const GET: RequestHandler = async ({ params, url }) => {
	const type = params.piece
	const slug = params.slug
	const field = url.searchParams.get('field')

	const webPiece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!webPiece) {
		return error(404, 'piece does not exist')
	}

	let markdown: string | null = null

	if (!field) {
		markdown = webPiece.note
	} else {
		const metadata = JSON.parse(webPiece.json_metadata || '{}')
		const values = getFrontmatterValues<string>(metadata, field).flat()
		const value = values[0]
		if (typeof value !== 'string') {
			return error(400, `field "${field}" is not a string`)
		}
		markdown = value
	}

	if (!markdown) {
		return error(404, 'no markdown content')
	}

	const html = await processMarkdown(markdown)

	return new Response(html, {
		headers: { 'content-type': 'text/html' }
	})
}
