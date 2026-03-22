declare module '$lib/pieces/helpers' {
	export interface WebPieces {
		id: string
		title: string
		slug: string
		file_path: string
		note?: string
		date_updated?: number
		date_added: number
		date_consumed?: number
		type: string
		media?: string
		json_metadata: string
		summary?: string
		keywords?: string
	}

	export interface WebPieceTags {
		piece_slug: string
		piece_type: string
		piece_id: string
		tag: string
		slug: string
	}

	export type PieceComponentHelpers = {
		getPieceUrl: () => string
		getPieceImageUrl: (
			image: string,
			minWidth: number,
			format: 'jpg' | 'avif' | 'webp' | 'png'
		) => string
	}

	export type PiecePageProps = {
		piece: WebPieces
		metadata: Record<string, any>
		tags: Partial<WebPieceTags>[]
		helpers: PieceComponentHelpers
	}

	export type PieceIconProps = {
		piece: WebPieces
		metadata?: Record<string, any>
		tags?: string[]
		size: {
			width: number
			height?: number
		}
		lazy?: boolean
		helpers?: PieceComponentHelpers
	}

	export type PieceIconPalette = {
		accent?: string
		background?: string
		bodyText?: string
		muted?: string
		titleText?: string
	}

	export type PieceOpengraphProps = {
		metadata: Record<string, any>
		tags: string[]
		piece: WebPieces
		size: {
			width: number
			height: number
		}
		palette?: PieceIconPalette
		helpers: PieceComponentHelpers
	}
}

type LuzzleComponent<Props> = {
	(props: Props): any
	new (options: { target: any; props?: Props }): any
}

declare module '$lib/pieces/components/icon.svelte' {
	import type { PieceIconProps } from '$lib/pieces/helpers'
	const Icon: LuzzleComponent<PieceIconProps>
	export default Icon
}

declare module '$lib/pieces/components/page.svelte' {
	import type { PiecePageProps } from '$lib/pieces/helpers'
	const Page: LuzzleComponent<PiecePageProps>
	export default Page
}

declare module '$lib/pieces/components/opengraph.svelte' {
	import type { PieceOpengraphProps } from '$lib/pieces/helpers'
	const Opengraph: LuzzleComponent<PieceOpengraphProps>
	export default Opengraph
}
