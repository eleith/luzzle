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

export type Font = {
	name: string
	weight?: number
	style: string
	data:  Buffer<ArrayBufferLike>
}
