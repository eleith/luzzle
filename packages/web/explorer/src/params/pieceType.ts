import { PUBLIC_LUZZLE_PIECE_TYPES } from '$env/static/public'
import type { WebPiece } from '$lib/pieces/types'

const luzzleTypes = PUBLIC_LUZZLE_PIECE_TYPES.split(',')

export function match(param: string): param is WebPiece['type'] {
	return luzzleTypes.includes(param)
}
