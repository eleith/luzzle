import { Pieces } from '@luzzle/core'
import { getStorage } from './storage'

let pieces: Pieces | null = null

export function getPieces(): Pieces {
	if (pieces) {
		return pieces
	}

	const storage = getStorage()
	pieces = new Pieces(storage)

	return pieces
}
