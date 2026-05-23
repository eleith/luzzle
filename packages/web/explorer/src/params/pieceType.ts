import { getPieceTypes } from '$lib/pieces/helpers'
import type { WebPieces, WebPiecesAsset } from '@luzzle/web.db'

type WebPiece = WebPieces & { assets: WebPiecesAsset[] }

export function match(param: string): param is WebPiece['type'] {
	return getPieceTypes().includes(param)
}
