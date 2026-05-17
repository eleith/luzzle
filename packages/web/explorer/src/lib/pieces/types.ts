import type { PieceFrontmatter } from '@luzzle/core'

export interface WebPiecesAsset {
	piece_file_path: string
	piece_key: string
	piece_asset_path?: string | null
	piece_field_path?: string
	asset_key: string
	transformation: string
	asset_path?: string | null
	mime_type: string
	is_embedded?: 0 | 1
	content?: string
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

export type WebPiece = WebPieces & {
	assets: WebPiecesAsset[]
}

export type PublicWebPieceAsset = Pick<
	WebPiecesAsset,
	'asset_key' | 'transformation' | 'asset_path' | 'mime_type' | 'is_embedded' | 'content'
>

export type PublicWebPiece = Omit<WebPieces, 'file_path' | 'json_metadata'> & {
	metadata: PieceFrontmatter
	assets: PublicWebPieceAsset[]
}

export type AssembledPreview = {
	piece: PublicWebPiece
	tags: Array<{ slug: string; tag: string }>
}
