import {
	PRIVATE_LUZZLE_STORAGE_PASSWORD,
	PRIVATE_LUZZLE_STORAGE_ROOT,
	PRIVATE_LUZZLE_STORAGE_URL,
	PRIVATE_LUZZLE_STORAGE_USERNAME
} from '$env/static/private'
import { StorageWebDAV, Pieces } from '@luzzle/cli'

const url = PRIVATE_LUZZLE_STORAGE_URL
const root = PRIVATE_LUZZLE_STORAGE_ROOT
const username = PRIVATE_LUZZLE_STORAGE_USERNAME
const password = PRIVATE_LUZZLE_STORAGE_PASSWORD

let pieces: Pieces

function getPieces() {
	if (!pieces) {
		const storage = new StorageWebDAV(url, root, { username, password })
		pieces = new Pieces(storage)
	}

	return pieces
}

export { getPieces }
