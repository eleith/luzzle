import type { PublicWebPiece, PublicWebPieceAsset } from '@luzzle/web.db'
import type { PieceFrontMatterValue } from '@luzzle/core'

export type { PublicWebPiece, PublicWebPieceAsset }

export type PieceIconPalette = {
	accent?: string
	background?: string
	bodyText?: string
	muted?: string
	titleText?: string
}

export type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (
		image: PieceFrontMatterValue | string | undefined | null,
		minWidth: number,
		format: 'jpg' | 'avif' | 'webp' | 'png'
	) => string | undefined
	getPiecePalette: () => PieceIconPalette | undefined
	getPieceAssetUrl: (key: string, transform: string) => string | undefined
	getPieceAssetContent: (key: string, transform: string) => string | undefined
}

export function getPieceHelpers(
	piece: PublicWebPiece,
	assetUrlBase = '/pieces/assets/'
): PieceComponentHelpers {
	const getPiecePalette = () => {
		const paletteAsset = piece.assets.find((a) => a.transformation === 'palette')
		return paletteAsset?.content
			? (JSON.parse(paletteAsset.content) as PieceIconPalette)
			: undefined
	}

	return {
		getPieceUrl: () => `/pieces/${piece.type}/${piece.slug}`,

		getPieceAssetUrl: (key: string, transform: string) => {
			const asset = piece.assets.find((a) => a.asset_key === key && a.transformation === transform)
			return asset?.asset_path ? `${assetUrlBase}${asset.asset_path}` : undefined
		},

		getPieceAssetContent: (key: string, transform: string) => {
			const asset = piece.assets.find((a) => a.asset_key === key && a.transformation === transform)
			return asset?.content
		},

		getPieceImageUrl: (
			assetKey: PieceFrontMatterValue | string | undefined | null,
			minWidth: number,
			format: 'jpg' | 'avif' | 'webp' | 'png'
		) => {
			const size = minWidth <= 125 ? 's' : minWidth <= 250 ? 'm' : minWidth <= 500 ? 'l' : 'xl'
			const transformation = `image.${size}.${format}`
			const assets = piece.assets.filter((asset) => asset.asset_key === assetKey)

			const transformed = assets.find((a) => a.transformation === transformation)?.asset_path
			if (transformed) return `${assetUrlBase}${transformed}`

			const original = assets.find((a) => a.transformation === 'image.original')?.asset_path
			if (original) return `${assetUrlBase}${original}`

			return undefined
		},

		getPiecePalette
	}
}
