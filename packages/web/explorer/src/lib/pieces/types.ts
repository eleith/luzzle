export const WebPieceTypes = ['books', 'links', 'texts', 'games', 'films'] as const
export const WebPieceTypesRegExp = RegExp(WebPieceTypes.join('|'))

type WebPieceType = (typeof WebPieceTypes)[number]

export interface WebPieces {
	id: string
	title: string
	slug: string
	file_path: string
	note?: string
	date_updated?: number
	date_added: number
	date_consumed?: number
	type: WebPieceType
	media?: string
	json_metadata: string
	summary?: string
	keywords?: string
}

export interface WebPieceTags {
	piece_slug: string
	piece_type: WebPieceType
	piece_id: string
	tag: string
	slug: string
}

export const WebPieceIconWidths = [125, 250, 375, 500] as const
export const WebPieceIconHeights = [187.5, 375, 562.5, 750] as const
export const WebPieceIconSizesNames = ['s', 'm', 'l', 'xl'] as const
export const WebPieceIconSizes = {
	s: { width: WebPieceIconWidths[0], height: WebPieceIconHeights[0] },
	m: { width: WebPieceIconWidths[1], height: WebPieceIconHeights[1] },
	l: { width: WebPieceIconWidths[2], height: WebPieceIconHeights[2] },
	xl: { width: WebPieceIconWidths[3], height: WebPieceIconHeights[3] }
} as const

export type WebPieceIconSize = typeof WebPieceIconSizes
export type WebPieceIconSizeName = (typeof WebPieceIconSizesNames)[number]

export interface WebPieceIconProps {
	piece: WebPieces & { frontmatter: Record<string, unknown>; tags: string[] }
	icon: {
		size: (typeof WebPieceIconSizes)[keyof typeof WebPieceIconSizes]
		active: boolean
		lazy: boolean
	}
	helpers: {
		getPieceUrl: () => string
		getImageUrl: (asset: string, format: 'jpg' | 'avif') => string
		getIconScale: (baselineWidth: number) => number
	}
}
