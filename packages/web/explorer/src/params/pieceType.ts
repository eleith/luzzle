import { getPieceTypes } from '$lib/pieces/helpers'
import type { WebPiece } from '$lib/pieces/types'

export function match(param: string): param is WebPiece['type'] {
	return getPieceTypes().includes(param)
}
