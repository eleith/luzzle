import { type WebPieces } from '@luzzle/tools/types'

export function match(param: string): param is WebPieces['type'] {
	return param.length > 0
}
