import type { Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../../services/db.js'
import type { Logger } from '../../services/logger.js'

import type { AssetRecord } from '@luzzle/web.jobs'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import type { OpengraphMode } from '../../pieces/authored-opengraph.js'
export type { AssetRecord }

export type TransformInput = {
	webPiece: WebPieces
	config: Config
	outDir: string
	pieces: Pieces
	assetKeyToPath: Map<string, string>
	logger: Logger
	mode?: OpengraphMode
	priorAssets?: PublicWebPieceAsset[]
	buildAssetUrl?: (path: string) => string | undefined
}
