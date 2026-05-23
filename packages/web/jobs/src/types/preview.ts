import type { PieceFrontmatter } from '@luzzle/core'
import type { AssetRecord } from './shared.js'

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
