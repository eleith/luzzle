declare function $props<T = unknown>(): T
declare function $state<T = unknown>(value: T): T
declare function $derived<T = unknown>(value: T): T
declare function $effect(fn: () => void | (() => void)): void

declare type PieceIconPalette = {
	accent?: string
	background?: string
	bodyText?: string
	muted?: string
	titleText?: string
}

declare type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (
		image: unknown,
		minWidth: number,
		format: 'jpg' | 'avif' | 'webp' | 'png'
	) => string | undefined
	getPiecePalette: () => PieceIconPalette | undefined
	getPieceAssetUrl: (key: string, transform: string) => string | undefined
	getPieceAssetContent: (key: string, transform: string) => string | undefined
}

declare type PieceMode = 'public' | 'local' | 'preview'

declare interface WebPieces {
	id: string
	title: string
	slug: string
	type: string
	key: string
	note?: string
	date_consumed?: number
	summary?: string
	keywords?: string
	metadata: Record<string, unknown>
	assets: Array<{
		asset_key?: string
		transformation?: string
		asset_path?: string
		content?: string
	}>
}

declare interface WebPieceTags {
	piece_slug: string
	piece_type: string
	piece_id: string
	tag: string
	slug: string
}

declare type PieceIconProps = {
	piece: WebPieces
	active?: boolean
	tags?: string[]
	size: { width: number; height?: number }
	lazy?: boolean
	helpers: PieceComponentHelpers
}

declare type PieceOpengraphProps = {
	piece: WebPieces
	helpers: PieceComponentHelpers
}

declare type PieceComponents = {
	NavBanner: import('svelte').Component<{
		background?: string
		color?: string
		hoverColor?: string
		showHome?: boolean
		showSearch?: boolean
		showThemeToggle?: boolean
		showProgress?: boolean
		showRandom?: boolean
		items?: {
			left?: import('svelte').Snippet<[]>
			right?: import('svelte').Snippet<[]>
		}
	}>
	PieceIcon: import('svelte').Component<PieceIconProps>
}

declare type PiecePageProps = {
	piece: WebPieces
	tags: Partial<WebPieceTags>[]
	helpers: PieceComponentHelpers
	components: PieceComponents
}

declare type RootComponents = {
	ContentBanner: import('svelte').Component<{
		background?: string
		color?: string
		hoverColor?: string
		showHome?: boolean
		showSearch?: boolean
		showThemeToggle?: boolean
		showProgress?: boolean
		showRandom?: boolean
		items?: {
			left?: import('svelte').Snippet<[]>
			right?: import('svelte').Snippet<[]>
		}
	}>
	PieceIcon: import('svelte').Component<{
		piece: WebPieces
		active?: boolean
		lazy?: boolean
		size: { width: number; height?: number }
	}>
}

declare type RootPageProps = {
	types: string[]
	pieces: WebPieces[]
	components: RootComponents
}

declare type FeedPageProps = {
	feedUrl: string
	feedType: 'tag' | 'piece'
	feedLabel: string
	feedItems: WebPieces[]
	components: RootComponents
}
