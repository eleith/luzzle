import type { Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../../services/db.js'
import type { Logger } from '../../services/logger.js'

export type { AssetRecord } from '../../api/shared.js'

export type TransformInput = {
	webPiece: WebPieces
	config: Config
	outDir: string
	pieces: Pieces
	assetKeyToPath: Map<string, string>
	logger: Logger
}
