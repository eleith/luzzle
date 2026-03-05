import type { Pieces } from '@luzzle/core'
import type { Config, WebPieces, WebPiecesAsset } from '@luzzle/web.utils'

export type TransformInput = {
	webPiece: WebPieces
	config: Config
	outDir: string
	pieces: Pieces
	assetKeyToPath: Map<string, string>
}

export type AssetRecord = Omit<WebPiecesAsset, 'piece_file_path' | 'piece_key' | 'asset_key'>
