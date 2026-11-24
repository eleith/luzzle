import { resolve } from 'node:path'
import {
	formatPieceDate,
	interpolate,
	safeExternalUrl,
	type PublicWebPiece
} from '@luzzle/web.pieces'
import type { PageNavigation, ServerPageProps } from '@luzzle/web.templates/pages/props'
import { resolveTemplateFields } from '@luzzle/web.templates/mapping'
import { createTemplateFileCache } from '@luzzle/web.templates/server'
import { createRenderHelpers } from '#lib/pieces/helpers/render.js'
import type { AppConfig } from '#lib/server/config.js'

const pages = createTemplateFileCache({ reloadOnChange: process.env.LUZZLE_DEV === 'true' })

export async function preloadConfiguredPages(config: AppConfig) {
	const seen = new Set<string>()
	for (const piece of config.pieces) {
		if (seen.has(piece.type)) continue
		seen.add(piece.type)
		const page = piece.templates?.page
		if (page && 'file' in page) await pages.load(resolve(page.file))
	}
}

export async function renderPublishedPage(
	piece: PublicWebPiece,
	tags: ServerPageProps<unknown>['tags'],
	config: AppConfig
) {
	const page = config.pieces.find((entry) => entry.type === piece.type)?.templates?.page
	if (!page || !('file' in page))
		throw new Error(`No page template file configured for ${piece.type}`)
	const template = await pages.load(resolve(page.file))
	let requestedNavBar: PageNavigation | undefined
	const fields = resolveTemplateFields(piece.metadata, page.mapping)
	const helpers: ServerPageProps<unknown>['helpers'] = {
		...createRenderHelpers(piece, {
			mode: 'published',
			appUrl: config.url.app,
			assetBaseUrl: config.url.luzzle_assets
		}),
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
