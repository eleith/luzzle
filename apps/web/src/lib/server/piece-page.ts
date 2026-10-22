import { resolvePreparedDirectory } from '@luzzle/web.config'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { createTemplateUrlBuilders } from '$lib/pieces/urls.server.js'
import type { PreparedPage } from '$lib/content/types.js'
import { config } from './config.js'
import { loadTemplateBundle } from './templates.js'
import { renderTemplatePage } from './template-page.js'

interface PiecePageRequest {
	piece: PublicWebPiece
	tags: Array<{ slug: string; tag: string }>
	url: URL
	previewJob?: string
}

export async function renderPreparedPiecePage(
	request: PiecePageRequest
): Promise<PreparedPage | null> {
	const { piece, tags } = request
	if (!config.paths.config) return null
	try {
		const bundle = await loadTemplateBundle(resolvePreparedDirectory(config))
		if (!bundle || !Object.hasOwn(bundle.templateLookup.pieces, piece.type)) return null
		const roles = bundle.templateLookup.pieces[piece.type]
		const pageTemplateName = Object.hasOwn(roles, 'page') ? roles.page : undefined
		if (!pageTemplateName) return null
		const rendered = renderTemplatePage(
			bundle,
			pageTemplateName,
			structuredClone({ piece, tags }),
			createTemplateUrlBuilders(request.url, request.previewJob)
		)
		return {
			revision: bundle.revision,
			body: rendered.body,
			head: `${rendered.head}<style data-prepared-theme>${bundle.themeCss}</style>`,
			navBanner: rendered.navBanner
		}
	} catch (error) {
		console.error(`Prepared page rendering failed for ${piece.type}`, error)
		return null
	}
}
