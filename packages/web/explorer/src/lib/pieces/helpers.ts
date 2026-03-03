import { type WebPieceTags } from '@luzzle/web.utils'
import { page } from '$app/state'
import type { WebPiece } from './types'

export type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (
		image: string,
		minWidth: number,
		format: 'jpg' | 'avif' | 'webp' | 'png'
	) => string
}

export type PieceIconProps = {
	piece: WebPiece
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
	piece: WebPiece
	size: {
		width: number
		height: number
	}
	palette?: PieceIconPalette
	helpers: PieceComponentHelpers
}

export type PiecePageProps = {
	piece: WebPiece
	metadata: Record<string, unknown>
	tags: Partial<WebPieceTags>[]
	html_note: string | null
	helpers: PieceComponentHelpers
}

export type PieceMode = 'public' | 'preview' | 'local'

export function getPieceHelpers(
	piece: WebPiece,
	mode: PieceMode = 'public'
): PieceComponentHelpers {
	const config = page.data.config
	const url = mode == 'public' ? config.url.luzzle_assets || config.url.app : ''

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
			const size = minWidth <= 125 ? 's' : minWidth <= 250 ? 'm' : minWidth <= 500 ? 'l' : 'xl'
			const transformation = `image.${size}.${format}`
			const assets = piece.assets.filter((asset) => asset.piece_asset_path === assetName)
			const transformed = assets.find((a) => a.transformation === transformation)?.asset_path
			const original = assets.find((a) => a.transformation === 'image.original')?.asset_path

			if (transformed) {
				return `${url}/pieces/assets/${transformed}`
			}

			if (original) {
				return `${url}/pieces/assets/${original}`
			}

			throw new Error(`Asset ${assetName} not found for piece ${piece.slug}`)
		}
	}
}
