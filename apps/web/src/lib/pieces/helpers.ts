import { createPieceHelpers, OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
import type { PublicWebPiece, PieceComponentHelpers, PieceIconPalette } from '@luzzle/web.pieces'
import { page } from '$app/state'
import { assetPathToUrl } from './assets.js'
import { previewOutputUrl } from './preview/output-url.js'

export { OpengraphImageWidth, OpengraphImageHeight }
export type { PieceComponentHelpers, PieceIconPalette }

function createAssetUrlBuilder(preview = false, job?: string): (path: string) => string {
	if (preview === true) {
		if (!job) throw new Error('Preview rendering requires a job.')
		return (path) => previewOutputUrl(path, job) ?? ''
	}

	const config = page.data.config
	const baseUrl = config.url.luzzle_assets || config.url.app
	return (path) => assetPathToUrl(path, baseUrl) ?? ''
}

export function getPieceHelpers(piece: PublicWebPiece): PieceComponentHelpers {
	const config = page.data.config
	const buildAssetUrl = createAssetUrlBuilder(page.data.preview, page.data.job)
	const assets = piece.assets.map((asset) =>
		asset.asset_path && !buildAssetUrl(asset.asset_path) ? { ...asset, asset_path: null } : asset
	)
	return createPieceHelpers(
		assets,
		buildAssetUrl,
		() =>
			`${config.url.app.replace(/\/+$/, '')}/pieces/${encodeURIComponent(piece.type)}/${encodeURIComponent(piece.slug)}`
	)
}
