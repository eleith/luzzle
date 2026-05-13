import type { PieceFrontmatter, Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'

export type PreviewContext = {
	frontmatter: PieceFrontmatter
	note: string | undefined
	filePath: string
	type: string
	slug: string
	key: string
	pieceConfig: Config['pieces'][number]
	config: Config
	pieces: Pieces
	keyToPath: Map<string, string>
	pathToKey: Map<string, string>
}

export type PreviewResolver = {
	name: string
	resolve: (context: PreviewContext) => Promise<PreviewAssetRecord[]>
}

export type PreviewAssetRecord = {
	asset_key: string
	transformation: string
	asset_path?: string | null
	mime_type: string
	is_embedded?: 0 | 1
	content?: string
	piece_asset_path?: string | null
}
