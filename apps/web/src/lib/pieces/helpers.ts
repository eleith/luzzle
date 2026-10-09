import type { WebPieceTags } from '@luzzle/web.db'
import { createPieceHelpers, OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
import type { PublicWebPiece, PieceComponentHelpers, PieceIconPalette } from '@luzzle/web.pieces'
import { page } from '$app/state'
import type { Component, Snippet } from 'svelte'
import { resolve } from '$app/paths'
import { assetPathToUrl } from './assets.js'

export { OpengraphImageWidth, OpengraphImageHeight }
export type { PieceComponentHelpers, PieceIconPalette }

export function getPieceTypes(): string[] {
	return __VITE__LUZZLE__PIECE__TYPES__
}

export type PieceIconProps = {
	piece: PublicWebPiece
	active: boolean
	tags: string[]
	size: {
		width: number
		height?: number
	}
	lazy?: boolean
	helpers: PieceComponentHelpers
}

export type PieceOpengraphProps = {
	piece: PublicWebPiece
	helpers: PieceComponentHelpers
}

export type NavBannerProps = {
	background?: string
	color?: string
	hoverColor?: string
	showHome?: boolean
	showSearch?: boolean
	showThemeToggle?: boolean
	showProgress?: boolean
	showRandom?: boolean
	items?: {
		left?: Snippet<[]>
		right?: Snippet<[]>
	}
}

export type PieceComponents = {
	NavBanner: Component<NavBannerProps>
	PieceIcon: Component<PieceIconProps>
}

export type PiecePageProps = {
	piece: PublicWebPiece
	tags: Partial<WebPieceTags>[]
	helpers: PieceComponentHelpers
	components: PieceComponents
}

function createAssetUrlBuilder(preview = false, job?: string): (path: string) => string {
	if (preview === true) {
		if (!job) throw new Error('Preview rendering requires a job.')
		return (path) =>
			resolve('/admin/preview/[jobId]/asset/[...asset]', {
				jobId: encodeURIComponent(job),
				asset: path.split('/').map(encodeURIComponent).join('/')
			})
	}

	const config = page.data.config
	const baseUrl = config.url.luzzle_assets || config.url.app
	return (path) => assetPathToUrl(path, baseUrl) ?? ''
}

export function getPieceHelpers(piece: PublicWebPiece): PieceComponentHelpers {
	const config = page.data.config
	const buildAssetUrl = createAssetUrlBuilder(page.data.preview, page.data.job)
	const assets = piece.assets.map((asset) =>
		asset.asset_path && !buildAssetUrl(asset.asset_path) ? { ...asset, asset_path: null } : asset
	)
	return createPieceHelpers(
		assets,
		buildAssetUrl,
		() =>
			`${config.url.app.replace(/\/+$/, '')}/pieces/${encodeURIComponent(piece.type)}/${encodeURIComponent(piece.slug)}`
	)
}
