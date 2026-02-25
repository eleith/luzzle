export interface WebPiecesAsset {
	piece_file_path: string
	piece_key: string
	asset_name: string
	transformation: string
	asset_path: string
	mime_type: string
	is_embedded: boolean
	cached_content: string | null
}

export interface WebPieces {
	id: string
	key: string
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
