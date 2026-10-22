import type { PublicWebPiece } from '@luzzle/web.pieces'
import type { NavBannerColors } from '@luzzle/web.templates/components/props'
import type ContentBanner from './components/ContentBanner.svelte'
import type PieceIcon from '$lib/pieces/components/icon.svelte'

export type RootComponents = {
	ContentBanner: typeof ContentBanner
	PieceIcon: typeof PieceIcon
}

export type RootPageProps = {
	types: string[]
	pieces: PublicWebPiece[]
	components: RootComponents
}

export interface PreparedPage {
	revision: string
	body: string
	head: string
	navBanner: NavBannerColors | null
}

export type Page404Props = {
	message?: string
	components: RootComponents
}

export type PageErrorProps = {
	status: number
	message?: string
	components: RootComponents
}
