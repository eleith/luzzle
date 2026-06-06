import type { PublicWebPiece } from '@luzzle/web.pieces'
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
