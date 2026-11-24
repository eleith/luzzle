import {
	assetPathToUrl,
	createPieceHelpers,
	previewOutputUrl,
	type PieceComponentHelpers,
	type PublicWebPiece
} from '@luzzle/web.pieces'
import { publicPieceHref } from '../navigation.js'

export type RenderContext =
	| { mode: 'published'; appUrl: string; assetBaseUrl?: string }
	| { mode: 'preview'; appUrl: string; job: string }

function assetUrlBuilder(context: RenderContext) {
	if (context.mode === 'preview') {
		const { job } = context
		return (path: string) => previewOutputUrl(path, job)
	}
	const baseUrl = context.assetBaseUrl || context.appUrl
	return (path: string) => assetPathToUrl(path, baseUrl)
}

export function createRenderHelpers(
	piece: PublicWebPiece,
	context: RenderContext
): PieceComponentHelpers {
	const buildAssetUrl = assetUrlBuilder(context)
	const pieceUrl = `${context.appUrl.replace(/\/+$/, '')}${publicPieceHref(piece)}`
	return createPieceHelpers(piece.assets, buildAssetUrl, () => pieceUrl)
}
