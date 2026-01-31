import { getImageAssetPath, type WebPieces, type WebPieceTags } from '@luzzle/web.utils'
import { page } from '$app/state'

export type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (image: string, minWidth: number, format: 'jpg' | 'avif') => string
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
	if (mode === 'preview') {
		return {
			getPieceUrl: () => `/editor/piece/${piece.file_path}`,
			getPieceImageUrl: (asset: string) => `/editor/asset/${asset}`
		}
	}

	if (mode === 'local') {
		return {
			getPieceUrl: () => `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`,
			getPieceImageUrl: (asset: string, width: number, format: 'jpg' | 'avif') => {
				const path = getImageAssetPath(piece.type, piece.id, asset, width, format)
				return `/pieces/assets/${path}`
			}
		}
	}

	return {
		getPieceUrl: () => `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`,
		getPieceImageUrl: (asset: string, width: number, format: 'jpg' | 'avif') => {
			const path = getImageAssetPath(piece.type, piece.id, asset, width, format)
			return `${page.data.config.url.luzzle_assets}/pieces/assets/${path}`
		}
	}
}
