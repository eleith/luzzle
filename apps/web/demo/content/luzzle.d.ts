// Portable author-folder snapshot of the current public API, not a runtime implementation.
// Internal consumers remain checked against the canonical package contracts.
declare function $props<T = unknown>(): T
declare function $state<T = unknown>(value: T): T
declare function $derived<T = unknown>(value: T): T
declare function $effect(fn: () => void | (() => void)): void

// Structural Svelte 5 public Component call shape for editor prop inference.
// No private runtime types or installed Svelte package are required by this file.
declare type LuzzleComponent<Props> = (internals: unknown, props: Props) => Record<string, unknown>

declare type PieceIconPalette = {
	accent?: string
	background?: string
	bodyText?: string
	muted?: string
	titleText?: string
}

declare type ImageFormat = 'jpg' | 'avif' | 'webp' | 'png'

declare interface PublicWebPieceAsset {
	asset_key: string
	transformation: string
	asset_path?: string | null
	mime_type: string
	is_embedded?: 0 | 1
	content?: string
}

// Mirrors PublicWebPiece's public fields only; dates are epoch milliseconds.
declare interface WebPieces {
	id: string
	key: string
	title: string
	slug: string
	type: string
	note?: string
	date_updated?: number
	date_added: number
	date_consumed?: number
	summary?: string
	keywords?: string
	// Schema-derived author metadata generation is deferred. Metadata may include
	// arbitrary schema-specific arrays/objects used by authored template functions.
	metadata: Record<string, any>
	assets: PublicWebPieceAsset[]
}

declare type PublicWebPiece = WebPieces

declare interface WebPieceTags {
	piece_slug: string
	piece_type: string
	piece_id: string
	tag: string
	slug: string
}

declare interface TemplateSize {
	readonly width: number
	readonly height: number
}

declare interface NavBannerColors {
	readonly background?: string
	readonly color?: string
	readonly hoverColor?: string
}

declare interface BoundPieceHelpers {
	getUrl(): string
	getPalette(): PieceIconPalette | undefined
	getImageUrl(
		assetKey: string | null | undefined,
		minWidth: number,
		format: ImageFormat
	): string | undefined
	getAssetUrl(assetKey: string, transformation: string): string | undefined
	getAssetContent(assetKey: string, transformation: string): string | undefined
}

declare interface TemplateHelpers {
	forPiece(piece: PublicWebPiece): BoundPieceHelpers
	// Constructs a URL for a valid relative path; file availability is not checked.
	getStaticAssetUrl(relativePath: string): string | undefined
}

declare interface PageTemplateHelpers extends TemplateHelpers {
	// No call means no banner; no arguments requests the app-owned defaults.
	showNavBanner(colors?: NavBannerColors): void
}

declare interface PieceTag {
	readonly tag: string
	readonly slug: string
}

declare interface PieceData<T extends string> {
	readonly piece: PublicWebPiece & { readonly type: T }
}

declare interface PieceIconInputs<T extends string = string> {
	readonly piece: PublicWebPiece & { readonly type: T }
	readonly size: {
		readonly width: number
		// Omission resolves to width * 1.5 before rendering the icon.
		readonly height?: number
	}
	readonly lazy?: boolean
	readonly active?: boolean
}

declare interface PieceComponents {
	readonly PieceIcon: LuzzleComponent<PieceIconInputs>
}

declare interface PiecePageProps<T extends string = string> {
	readonly data: PieceData<T> & { readonly tags: readonly PieceTag[] }
	readonly helpers: PageTemplateHelpers
	readonly components: PieceComponents
}

declare interface PieceIconOptions {
	readonly size: TemplateSize
	readonly lazy: boolean
	readonly active: boolean
}

declare interface PieceIconProps<T extends string = string> {
	readonly data: PieceData<T>
	readonly options: PieceIconOptions
	readonly helpers: TemplateHelpers
}

// Legacy Open Graph/site globals below still describe the existing pipeline.
declare type PieceMode = 'public' | 'local' | 'preview'

declare type PieceComponentHelpers = {
	getPieceUrl: () => string
	getPieceImageUrl: (image: unknown, minWidth: number, format: ImageFormat) => string | undefined
	getPiecePalette: () => PieceIconPalette | undefined
	getPieceAssetUrl: (key: string, transform: string) => string | undefined
	getPieceAssetContent: (key: string, transform: string) => string | undefined
}

declare type PieceOpengraphProps = {
	piece: WebPieces
	helpers: PieceComponentHelpers
}

declare type RootComponents = {
	ContentBanner: LuzzleComponent<{
		background?: string
		color?: string
		hoverColor?: string
		showHome?: boolean
		showSearch?: boolean
		showThemeToggle?: boolean
		showProgress?: boolean
		showRandom?: boolean
		items?: {
			// Opaque snippet callbacks supplied to the legacy banner, not invoked here.
			left?: () => unknown
			right?: () => unknown
		}
	}>
	PieceIcon: LuzzleComponent<{
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

declare type Page404Props = {
	message?: string
	components: RootComponents
}

declare type PageErrorProps = {
	status: number
	message?: string
	components: RootComponents
}
