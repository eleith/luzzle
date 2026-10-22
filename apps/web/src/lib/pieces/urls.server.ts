import type { TemplateUrlBuilders } from './template-helpers.js'
import { assetPathToUrl, staticAssetPathToUrl } from './assets.js'
import { previewOutputUrl } from './preview/output-url.js'
import { config } from '$lib/server/config'

export function createTemplateUrlBuilders(url: URL, previewJob?: string): TemplateUrlBuilders {
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
