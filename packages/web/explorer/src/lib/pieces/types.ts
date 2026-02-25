import type { WebPieces, WebPiecesAsset } from '@luzzle/web.utils'

export type WebPiece = WebPieces & {
	assets: WebPiecesAsset[]
}
