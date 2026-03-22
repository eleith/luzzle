import { type WebPieceTags } from '@luzzle/web.utils'
import { page } from '$app/state'
import type { PublicWebPiece } from './types'
import type { PieceFrontMatterValue } from '@luzzle/core'

export type PieceComponentHelpers = {
	getPieceUrl: () => PieceFrontMatterValue | string
	getPieceImageUrl: (
		image: PieceFrontMatterValue | string,
		minWidth: number,
		format: 'jpg' | 'avif' | 'webp' | 'png'
	) => string | undefined
	getPiecePalette: () => PieceIconPalette | undefined
	getPieceAssetUrl: (key: string, transform: string) => string | undefined
	getPieceAssetContent: (key: string, transform: string) => string | undefined
}

export type PieceIconProps = {
	piece: PublicWebPiece
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
	tags: string[]
	piece: PublicWebPiece
	size: {
		width: number
		height: number
	}
	helpers: PieceComponentHelpers
}

export type PiecePageProps = {
	piece: PublicWebPiece
	tags: Partial<WebPieceTags>[]
	helpers: PieceComponentHelpers
}

export type PieceMode = 'public' | 'local'

export function getPieceHelpers(
	piece: PublicWebPiece,
	mode: PieceMode = 'public'
): PieceComponentHelpers {
	const config = page.data.config
	const url = mode == 'public' ? config.url.luzzle_assets || config.url.app : config.url.app || ''

	const getPiecePalette = () => {
		const paletteAsset = piece.assets.find((a) => a.transformation === 'palette')
		return paletteAsset?.content
			? (JSON.parse(paletteAsset.content) as PieceIconPalette)
			: undefined
	}

	return {
		getPieceUrl: () => `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`,
		getPieceAssetUrl: (key: string, transform: string) => {
			const one = piece.assets.find(
				(asset) => asset.asset_key === key && asset.transformation === transform
			)
			return one ? `${url}/pieces/assets/${one.asset_path}` : undefined
		},
		getPieceAssetContent: (key: string, transform: string) => {
			const one = piece.assets.find(
				(asset) => asset.asset_key === key && asset.transformation === transform
			)
			return one ? one.content : undefined
		},
		getPieceImageUrl: (
			assetKey: PieceFrontMatterValue | string,
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

			return undefined
		},
		getPiecePalette
	}
}
