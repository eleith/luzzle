import { createPieceHelpers, type PublicWebPiece } from '@luzzle/web.pieces'
import type { NavBannerColors } from '@luzzle/web.templates/components/props'
import type { PageTemplateHelpers, TemplateHelpers } from '@luzzle/web.templates/helpers'

export interface TemplateUrlBuilders {
	buildPieceUrl(piece: PublicWebPiece): string
	buildAssetUrl(assetPath: string): string | undefined
	buildStaticAssetUrl(relativePath: string): string | undefined
}

export function createPageTemplateHelpers(
	urls: TemplateUrlBuilders,
	onNavigation: (colors: NavBannerColors) => void
): PageTemplateHelpers {
	return {
		...createTemplateHelpers(urls),
		showNavBanner(colors = {}) {
			const snapshot = {
				background: colors.background,
				color: colors.color,
				hoverColor: colors.hoverColor
			}
			onNavigation(
				Object.fromEntries(Object.entries(snapshot).filter(([, value]) => value !== undefined))
			)
		}
	}
}

export function createTemplateHelpers(urls: TemplateUrlBuilders): TemplateHelpers {
	return {
		forPiece(piece) {
			const buildAssetUrl = (assetPath: string) => urls.buildAssetUrl(assetPath) ?? ''
			const assets = piece.assets.map((asset) => {
				if (!asset.asset_path) return asset
				if (buildAssetUrl(asset.asset_path)) return asset
				return { ...asset, asset_path: null }
			})
			const helpers = createPieceHelpers(assets, buildAssetUrl, () => urls.buildPieceUrl(piece))
			return {
				getUrl: helpers.getPieceUrl,
				getPalette: helpers.getPiecePalette,
				getImageUrl: helpers.getPieceImageUrl,
				getAssetUrl: helpers.getPieceAssetUrl,
				getAssetContent: helpers.getPieceAssetContent
			}
		},
		getStaticAssetUrl(relativePath) {
			return urls.buildStaticAssetUrl(relativePath)
		}
	}
}
