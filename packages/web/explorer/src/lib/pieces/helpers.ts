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

export type PieceMode = 'public' | 'local' | 'preview'

function createPieceHelpers(
	piece: PublicWebPiece,
	buildAssetUrl: (path: string) => string
): PieceComponentHelpers {
	const getPiecePalette = () => {
		const paletteAsset = piece.assets.find((a) => a.transformation === 'palette')
		return paletteAsset?.content
			? (JSON.parse(paletteAsset.content) as PieceIconPalette)
			: undefined
	}

	return {
		getPieceUrl: () => `${page.data.config.url.app}/pieces/${piece.type}/${piece.slug}`,

		getPieceAssetUrl: (key: string, transform: string) => {
			const asset = piece.assets.find((a) => a.asset_key === key && a.transformation === transform)
			return asset?.asset_path ? buildAssetUrl(asset.asset_path) : undefined
		},

		getPieceAssetContent: (key: string, transform: string) => {
			const asset = piece.assets.find((a) => a.asset_key === key && a.transformation === transform)
			return asset?.content
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
			if (transformed) return buildAssetUrl(transformed)

			const original = assets.find((a) => a.transformation === 'image.original')?.asset_path
			if (original) return buildAssetUrl(original)

			return undefined
		},

		getPiecePalette
	}
}

function getPublicPieceHelpers(piece: PublicWebPiece): PieceComponentHelpers {
	const config = page.data.config
	const baseUrl = config.url.luzzle_assets || config.url.app
	return createPieceHelpers(piece, (path) => `${baseUrl}/pieces/assets/${path}`)
}

function getLocalPieceHelpers(piece: PublicWebPiece): PieceComponentHelpers {
	return createPieceHelpers(piece, (path) => `/pieces/assets/${path}`)
}

function getPreviewPieceHelpers(piece: PublicWebPiece): PieceComponentHelpers {
	return createPieceHelpers(piece, (path) => `/editor/asset/${path}`)
}

export function getPieceHelpers(
	piece: PublicWebPiece,
	mode: PieceMode = 'public'
): PieceComponentHelpers {
	if (mode === 'preview') return getPreviewPieceHelpers(piece)
	if (mode === 'local') return getLocalPieceHelpers(piece)
	return getPublicPieceHelpers(piece)
}
