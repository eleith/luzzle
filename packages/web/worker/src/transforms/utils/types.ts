import type { Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../../services/db.js'
import type { Logger } from '../../services/logger.js'

import type { AssetRecord } from '@luzzle/web.jobs'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
export type { AssetRecord }

export type TransformInput = {
	webPiece: WebPieces
	config: Config
	outDir: string
	pieces: Pieces
	assetKeyToPath: Map<string, string>
	logger: Logger
	priorAssets?: PublicWebPieceAsset[]
}
