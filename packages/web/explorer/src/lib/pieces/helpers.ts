import { type WebPieceTags } from '@luzzle/web.utils'
import { page } from '$app/state'
import type { WebPiece, PublicWebPiece } from './types'

type AnyPiece = WebPiece | PublicWebPiece

export type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (
		image: string,
		minWidth: number,
		format: 'jpg' | 'avif' | 'webp' | 'png'
	) => string
	getPiecePalette: () => PieceIconPalette | undefined
}

export type PieceIconProps = {
	piece: AnyPiece
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
	piece: AnyPiece
	size: {
		width: number
		height: number
	}
	helpers: PieceComponentHelpers
}

export type PiecePageProps = {
	piece: AnyPiece
	metadata: Record<string, unknown>
	tags: Partial<WebPieceTags>[]
	html_note: string | null
	helpers: PieceComponentHelpers
}

export type PieceMode = 'public' | 'local'

export function getPieceHelpers(
	piece: AnyPiece,
	mode: PieceMode = 'public'
): PieceComponentHelpers {
	const config = page.data.config
	const url = mode == 'public' ? config.url.luzzle_assets || config.url.app : ''

	const getPiecePalette = () => {
		const paletteAsset = piece.assets.find((a) => a.transformation === 'palette')
		return paletteAsset?.content
			? (JSON.parse(paletteAsset.content) as PieceIconPalette)
			: undefined
	}

	return {
		getPieceUrl: () => `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`,
		getPieceImageUrl: (
			assetKey: string,
			minWidth: number,
			format: 'jpg' | 'avif' | 'webp' | 'png'
		) => {
			const size = minWidth <= 125 ? 's' : minWidth <= 250 ? 'm' : minWidth <= 500 ? 'l' : 'xl'
			const transformation = `image.${size}.${format}`
			const assets = piece.assets.filter((asset) => asset.asset_key === assetKey)
			const transformed = assets.find((a) => a.transformation === transformation)?.asset_path
			const original = assets.find((a) => a.transformation === 'image.original')?.asset_path

			if (transformed) {
				return `${url}/pieces/assets/${transformed}`
			}

			if (original) {
				return `${url}/pieces/assets/${original}`
			}

			throw new Error(`Asset ${assetKey} not found for piece ${piece.slug}`)
		},
		getPiecePalette
	}
}
