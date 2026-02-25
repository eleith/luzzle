import { widthToSize, type WebPieces, type WebPieceTags } from '@luzzle/web.utils'
import { page } from '$app/state'

export type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (
		image: string,
		minWidth: number,
		format: 'jpg' | 'avif' | 'webp' | 'png'
	) => string
}

export type PieceIconProps = {
	piece: WebPieces
	metadata: Record<string, unknown>
	tags: string[]
	size: {
		width: number
		height?: number
	}
	lazy?: boolean
	helpers: PieceComponentHelpers
}

export type PieceIconPalette = {
	accent?: string
	background?: string
	bodyText?: string
	muted?: string
	titleText?: string
}

export type PieceOpengraphProps = {
	metadata: Record<string, unknown>
	tags: string[]
	piece: WebPieces
	size: {
		width: number
		height: number
	}
	palette?: PieceIconPalette
	helpers: PieceComponentHelpers
}

export type PiecePageProps = {
	piece: WebPieces
	metadata: Record<string, unknown>
	tags: Partial<WebPieceTags>[]
	html_note: string | null
	helpers: PieceComponentHelpers
}

export type PieceMode = 'public' | 'preview' | 'local'

export function getPieceHelpers(
	piece: WebPieces,
	mode: PieceMode = 'public'
): PieceComponentHelpers {
	const config = page.data.config
	const url = mode == 'public' ? config.url.luzzle_assets || config.url.app : config.url.app

	if (mode === 'preview') {
		return {
			getPieceUrl: () => `/editor/piece/${piece.file_path}`,
			getPieceImageUrl: (asset: string) => `${url}/editor/asset/${asset}`
		}
	}

	return {
		getPieceUrl: () => `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`,
		getPieceImageUrl: (
			assetName: string,
			minWidth: number,
			format: 'jpg' | 'avif' | 'webp' | 'png'
		) => {
			const size = widthToSize(minWidth)
			const transformation = `image.${size}.${format}`
			const found = piece.assets.find(
				(a) => a.asset_name === assetName && a.transformation === transformation
			)

			if (found) {
				return `${url}/pieces/assets/${found.asset_path}`
			}

			// Fallback to original if transformation not found
			const original = piece.assets.find(
				(a) => a.asset_name === assetName && a.transformation === 'original'
			)

			if (original) {
				return `${url}/pieces/assets/${original.asset_path}`
			}

			return `${url}/editor/asset/${assetName}`
		}
	}
}
