import { resolve } from 'node:path'
import {
	formatPieceDate,
	interpolate,
	safeExternalUrl,
	type PublicWebPiece
} from '@luzzle/web.pieces'
import type { PageNavbarProps, ServerPageProps } from '@luzzle/web.templates/pages/props'
import { resolveTemplateFields } from '@luzzle/web.templates/mapping'
import { createAuthoredTemplateCaches } from './cache.js'
import { createRenderHelpers, type RenderContext } from '#lib/pieces/helpers/render.js'
import type { AppConfig } from '#lib/server/config.js'

const pages = createAuthoredTemplateCaches()

export async function preloadAuthoredPages(config: AppConfig) {
	const seen = new Set<string>()
	for (const piece of config.pieces) {
		if (seen.has(piece.type)) continue
		seen.add(piece.type)
		const page = piece.templates?.page
		if (!page || !('file' in page)) continue
		const filename = resolve(page.file)
		await Promise.all([pages.published.load(filename), pages.preview.load(filename)])
	}
}

export async function renderAuthoredPage(
	piece: PublicWebPiece,
	tags: ServerPageProps<unknown>['tags'],
	config: AppConfig,
	context: RenderContext = {
		mode: 'published',
		appUrl: config.url.app,
		assetBaseUrl: config.url.luzzle_assets
	}
) {
	const page = config.pieces.find((entry) => entry.type === piece.type)?.templates?.page
	// Named and default pages use built-in components, not file-based rendering.
	if (!page || !('file' in page)) return null
	const template = await pages[context.mode].load(resolve(page.file))
	let requestedNavBar: PageNavbarProps | undefined
	const fields = resolveTemplateFields(piece.metadata, page.mapping)
	const assetHelpers = createRenderHelpers(piece, context)
	const helpers: ServerPageProps<unknown>['helpers'] = {
		...assetHelpers,
		formatPieceDate,
		interpolate,
		safeExternalUrl,
		requestNavBar(options) {
			requestedNavBar = options
		}
	}
	const html = template.render({ piece, fields, tags, helpers }, { idPrefix: 'piece-page' })
	return { html, css: template.css, requestedNavBar }
}
