import type { PieceFrontmatter } from '@luzzle/core'

export interface AssetRecord {
	piece_asset_path?: string | null
	piece_field_path?: string
	transformation: string
	asset_path?: string | null
	mime_type: string
	is_embedded?: 0 | 1
	content?: string
}

export interface PublishPayload {}
export type PublishResult = 'ok'

export interface PreviewPayload {
	filePath: string
}

export interface PreviewAsset extends AssetRecord {
	asset_key: string
}

export interface PreviewResult {
	filePath: string
	type: string
	slug: string
	pieceKey: string
	sanitizedFrontmatter: PieceFrontmatter
	note: string
	pathToKey: Record<string, string>
	transforms: PreviewAsset[]
}

export interface JobProgressPurgePayload {
	retentionDays?: number
}

export type JobProgressPurgeResult = 'ok'
