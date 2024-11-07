export const WebPieceTypes = ['books', 'links', 'texts', 'games', 'films'] as const
export const WebPieceTypesRegExp = RegExp(WebPieceTypes.join('|'))

type WebPieceType = (typeof WebPieceTypes)[number]

export interface WebPieces {
	id: string
	title: string
	slug: string
	note?: string
	date_updated: number
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
