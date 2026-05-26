import type { PublicWebPieceAsset } from '@luzzle/web.db'
import type { PieceFrontMatterValue } from '@luzzle/core'

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

export const OpengraphImageWidth = 1200
export const OpengraphImageHeight = 630

export function createPieceHelpers(
	assets: PublicWebPieceAsset[],
	buildAssetUrl: (assetPath: string) => string,
	buildPieceUrl: () => string
): PieceComponentHelpers {
	const getPiecePalette = () => {
		const paletteAsset = assets.find((a) => a.transformation === 'palette')
		return paletteAsset?.content
			? (JSON.parse(paletteAsset.content) as PieceIconPalette)
			: undefined
	}

	return {
		getPieceUrl: buildPieceUrl,

		getPieceAssetUrl: (key: string, transform: string) => {
			const asset = assets.find((a) => a.asset_key === key && a.transformation === transform)
			return asset?.asset_path ? buildAssetUrl(asset.asset_path) : undefined
		},

		getPieceAssetContent: (key: string, transform: string) => {
			const asset = assets.find((a) => a.asset_key === key && a.transformation === transform)
			return asset?.content
		},

		getPieceImageUrl: (
			assetKey: PieceFrontMatterValue | string | undefined | null,
			minWidth: number,
			format: 'jpg' | 'avif' | 'webp' | 'png'
		) => {
			const size = minWidth <= 125 ? 's' : minWidth <= 250 ? 'm' : minWidth <= 500 ? 'l' : 'xl'
			const transformation = `image.${size}.${format}`
			const matched = assets.filter((asset) => asset.asset_key === assetKey)

			const transformed = matched.find((a) => a.transformation === transformation)?.asset_path
			if (transformed) return buildAssetUrl(transformed)

			const original = matched.find((a) => a.transformation === 'image.original')?.asset_path
			if (original) return buildAssetUrl(original)

			return undefined
		},

		getPiecePalette
	}
}
