import { error } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import { db } from '#lib/server/database/index.js'
import { config } from '#lib/server/config.js'
import { getWebPiece } from '#lib/server/pieces.js'
import { hydrateWithAssets } from '#lib/pieces/assets.server.js'
import { getMarkdownPublicationStatus } from '#lib/pieces/publication.server.js'
import { getPieceLinks } from '#lib/pieces/navigation.js'

export const load: LayoutServerLoad = async ({ params, url, route, locals }) => {
	locals.inlineConfiguredStyles()
	const webPiece = await getWebPiece(db, params.path)
	if (!webPiece) error(404, 'Piece is not published.')

	const piece = await hydrateWithAssets(webPiece)
	const tags = await db
		.selectFrom('web_pieces_tags')
		.select(['slug', 'tag'])
		.distinct()
		.where('piece_id', '=', piece.id)
		.execute()

	const publishedUrl = new URL(config.url.app || '/', url.origin)
	publishedUrl.pathname = `${publishedUrl.pathname.replace(/\/+$/, '')}/pieces/${encodeURIComponent(piece.type)}/${encodeURIComponent(piece.slug)}`
	publishedUrl.search = ''
	publishedUrl.hash = ''

	return {
		file: params.path,
		piece,
		tags,
		publication: {
			lastPublishedAt: webPiece.last_published_at ?? null,
			markdownStatus: await getMarkdownPublicationStatus(params.path, webPiece.content_hash)
		},
		publishedUrl: publishedUrl.href,
		links: getPieceLinks(url, route.id)
	}
}
