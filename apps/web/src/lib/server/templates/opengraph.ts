import { getPieceConfig } from '@luzzle/web.config'
import {
	preloadAuthoredOpengraphFiles,
	renderAuthoredOpengraph as renderFileOpengraph
} from '@luzzle/web.templates/server'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { createRenderHelpers, type RenderContext } from '#lib/pieces/helpers/render.js'
import type { AppConfig } from '#lib/server/config.js'
import { createAuthoredTemplateCaches } from './cache.js'

const designs = createAuthoredTemplateCaches()

export function preloadAuthoredOpengraphs(config: AppConfig) {
	return preloadAuthoredOpengraphFiles(designs, config.pieces)
}

export async function renderAuthoredOpengraph(
	piece: PublicWebPiece,
	config: AppConfig,
	context: RenderContext = {
		mode: 'published',
		appUrl: config.url.app,
		assetBaseUrl: config.url.luzzle_assets
	}
) {
	const design = getPieceConfig(config.pieces, piece.type)?.templates?.opengraph
	if (!design || !('file' in design)) return null
	try {
		return await renderFileOpengraph(
			designs[context.mode],
			design,
			piece,
			createRenderHelpers(piece, context)
		)
	} catch (cause) {
		console.error(
			`Cannot render configured share HTML for ${context.mode} ${piece.type}/${piece.slug}`,
			cause
		)
		return 'failed' as const
	}
}
