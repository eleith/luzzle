import { type WebPieces } from '@luzzle/web.utils'
import { PUBLIC_LUZZLE_PIECE_TYPES } from '$env/static/public'

const luzzleTypes = PUBLIC_LUZZLE_PIECE_TYPES.split(',')

export function match(param: string): param is WebPieces['type'] {
	return luzzleTypes.includes(param)
}
