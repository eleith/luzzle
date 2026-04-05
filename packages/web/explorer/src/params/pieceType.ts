import { getPieceTypes } from '$lib/pieces/helpers'
import type { WebPiece } from '$lib/pieces/types'

const luzzleTypes = getPieceTypes()

export function match(param: string): param is WebPiece['type'] {
	return luzzleTypes.includes(param)
}
