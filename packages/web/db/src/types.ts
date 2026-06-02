import type { PieceFrontmatter, LuzzleTables } from '@luzzle/core'

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

export interface WebPieceTags {
	piece_slug: string
	piece_type: string
	piece_id: string
	tag: string
	slug: string
}

export interface JobProgressRow {
	job_id: string
	phase: string
	status: string
	started_at: number
	finished_at: number | null
	message: string | null
}

export interface JobProgressLogsRow {
	job_id: string
	phase: string
	line_number: number
	ts: number
	level: string
	message: string
}

export type WebDatabase = {
	web_pieces: WebPieces
	web_pieces_fts5: WebPieces
	web_pieces_tags: WebPieceTags
	web_pieces_assets: WebPiecesAsset
	job_progress: JobProgressRow
	job_progress_logs: JobProgressLogsRow
}

export type AppDatabase = WebDatabase & LuzzleTables

export type PublicWebPieceAsset = Pick<
	WebPiecesAsset,
	'asset_key' | 'transformation' | 'asset_path' | 'mime_type' | 'is_embedded' | 'content'
>

export type PublicWebPiece = Omit<WebPieces, 'file_path' | 'json_metadata'> & {
	metadata: PieceFrontmatter
	assets: PublicWebPieceAsset[]
}
