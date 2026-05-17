// Source of truth for the Preview Job contract.
// Mirrored by hand into the explorer via `npm run sync-worker-types`.
// Keep this file dependency-free: pure types only.

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
