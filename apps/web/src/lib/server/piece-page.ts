import { resolvePreparedDirectory } from '@luzzle/web.config'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { assetPathToUrl, staticAssetPathToUrl } from '$lib/pieces/assets.js'
import { previewOutputUrl } from '$lib/pieces/preview/output-url.js'
import type { TemplateUrlBuilders } from '$lib/pieces/template-helpers.js'
import type { PreparedPiecePage } from '$lib/pieces/types.js'
import { config } from './config.js'
import { loadTemplateBundle } from './templates.js'
import { renderTemplatePage } from './template-page.js'

interface PiecePageRequest {
	piece: PublicWebPiece
	tags: Array<{ slug: string; tag: string }>
	url: URL
	previewJob?: string
}

function bindPageUrls({ url, previewJob }: PiecePageRequest): TemplateUrlBuilders {
	const { app, luzzle_assets: assetBase, app_assets: staticBase } = config.url
	const siteUrl = new URL(app || '/', url.origin)
	return {
		buildPieceUrl(piece) {
			const target = new URL(siteUrl)
			target.pathname = `${target.pathname.replace(/\/+$/, '')}/pieces/${encodeURIComponent(piece.type)}/${encodeURIComponent(piece.slug)}`
			target.search = ''
			target.hash = ''
			return target.href
		},
		buildAssetUrl(assetPath) {
			if (previewJob !== undefined) return previewOutputUrl(assetPath, previewJob)
			return assetPathToUrl(assetPath, assetBase || app)
		},
		buildStaticAssetUrl(relativePath) {
			return staticAssetPathToUrl(relativePath, staticBase)
		}
	}
}

export async function renderPreparedPiecePage(
	request: PiecePageRequest
): Promise<PreparedPiecePage | null> {
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
			bindPageUrls(request)
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
