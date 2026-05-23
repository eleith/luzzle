export interface AssetRecord {
	piece_asset_path?: string | null
	piece_field_path?: string
	transformation: string
	asset_path?: string | null
	mime_type: string
	is_embedded?: 0 | 1
	content?: string
}
