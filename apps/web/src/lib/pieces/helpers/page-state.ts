import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
import { page } from '$app/state'
import { createRenderHelpers } from './render.js'

export { OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
export type { PieceComponentHelpers, PieceIconPalette } from '@luzzle/web.pieces'

export function getPieceHelpers(piece: PublicWebPiece): PieceComponentHelpers {
	const { config, preview, job } = page.data
	const appUrl = config.url.app
	if (preview === true) {
		if (!job) throw new Error('Preview rendering requires a job.')
		return createRenderHelpers(piece, { mode: 'preview', appUrl, job })
	}
	return createRenderHelpers(piece, {
		mode: 'published',
		appUrl,
		assetBaseUrl: config.url.luzzle_assets
	})
}
