declare module '$lib/pieces/helpers' {
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
			image: any,
			minWidth: number,
			format: 'jpg' | 'avif' | 'webp' | 'png'
		) => string | undefined
		getPiecePalette: () => PieceIconPalette | undefined
		getPieceAssetUrl: (key: string, transform: string) => string | undefined
		getPieceAssetContent: (key: string, transform: string) => string | undefined
	}

	export type PieceMode = 'public' | 'local' | 'preview'

	export interface WebPieces {
		id: string
		title: string
		slug: string
		type: string
		key: string
		note?: string
		date_consumed?: number
		summary?: string
		keywords?: string
		metadata: Record<string, any>
		assets: Array<{
			asset_key?: string
			transformation?: string
			asset_path?: string
			content?: string
		}>
	}

	export type PiecePageProps = {
		piece: WebPieces
		tags: Partial<WebPieceTags>[]
		helpers: PieceComponentHelpers
	}

	export interface WebPieceTags {
		piece_slug: string
		piece_type: string
		piece_id: string
		tag: string
		slug: string
	}

	export type PieceIconProps = {
		piece: WebPieces
		active: boolean
		tags: string[]
		size: { width: number; height?: number }
		lazy?: boolean
		helpers: PieceComponentHelpers
	}

	export type PieceOpengraphProps = {
		tags: string[]
		piece: WebPieces
		size: { width: number; height: number }
		helpers: PieceComponentHelpers
	}
}

declare module '$lib/pieces/components/icon.svelte' {
	import type { SvelteComponent } from 'svelte'
	import type { PieceIconProps } from '$lib/pieces/helpers'

	export default class extends SvelteComponent<PieceIconProps> {}
}

declare module '$lib/pieces/components/page.svelte' {
	import type { SvelteComponent } from 'svelte'
	import type { PiecePageProps } from '$lib/pieces/helpers'

	export default class extends SvelteComponent<PiecePageProps> {}
}

declare module '$lib/pieces/components/opengraph.svelte' {
	import type { SvelteComponent } from 'svelte'
	import type { PieceOpengraphProps } from '$lib/pieces/helpers'

	export default class extends SvelteComponent<PieceOpengraphProps> {}
}

declare module '$lib/components/layout/simple/NavBanner.svelte' {
	import type { SvelteComponent, Snippet } from 'svelte'

	type Props = {
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

	export default class extends SvelteComponent<Props> {}
}
