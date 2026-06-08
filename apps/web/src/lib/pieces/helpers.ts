import type { WebPieceTags } from '@luzzle/web.db'
import { createPieceHelpers, OpengraphImageWidth, OpengraphImageHeight } from '@luzzle/web.pieces'
import type { PublicWebPiece, PieceComponentHelpers, PieceIconPalette } from '@luzzle/web.pieces'
import { page } from '$app/state'
import type { Component, Snippet } from 'svelte'

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

function detectAssetUrlBuilder(): (path: string) => string {
	const jobId = page.params.jobId
	const pathname = page.url.pathname

	if (jobId && pathname.includes('/preview/')) {
		return (path) => `/admin/preview/${jobId}/asset/${path}`
	}

	if (pathname.startsWith('/admin/')) {
		return (path) => `/admin/asset/viewer/${path}`
	}

	const config = page.data.config
	const baseUrl = config.url.luzzle_assets || config.url.app
	return (path) => `${baseUrl}/pieces/assets/${path}`
}

export function getPieceHelpers(piece: PublicWebPiece): PieceComponentHelpers {
	const config = page.data.config
	return createPieceHelpers(
		piece.assets,
		detectAssetUrlBuilder(),
		() => `${config.url.app}/pieces/${piece.type}/${piece.slug}`
	)
}
