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

function getAuthoredPageConfig(pieceConfig: AppConfig['pieces'][number] | undefined) {
	const page = pieceConfig?.templates?.page
	if (page && 'file' in page) return page
}

export async function preloadAuthoredPages(config: AppConfig) {
	const seen = new Set<string>()
	for (const piece of config.pieces) {
		if (seen.has(piece.type)) continue
		seen.add(piece.type)
		const authoredPage = getAuthoredPageConfig(piece)
		if (!authoredPage) continue
		const filename = resolve(authoredPage.file)
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
	const pieceConfig = config.pieces.find((entry) => entry.type === piece.type)
	const authoredPage = getAuthoredPageConfig(pieceConfig)
	// Without an authored page, the caller renders the generic page.
	if (!authoredPage) return null
	const template = await pages[context.mode].load(resolve(authoredPage.file))
	let requestedNavBar: PageNavbarProps | undefined
	const fields = resolveTemplateFields(piece.metadata, authoredPage.mapping)
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
