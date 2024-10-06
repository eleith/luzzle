import { WebPieceTypesRegExp, type WebPieces } from '$lib/pieces/types'

export function match(param: string): param is WebPieces['type'] {
	return WebPieceTypesRegExp.test(param)
}
