import {
	PRIVATE_LUZZLE_STORAGE_PASSWORD,
	PRIVATE_LUZZLE_STORAGE_ROOT,
	PRIVATE_LUZZLE_STORAGE_URL,
	PRIVATE_LUZZLE_STORAGE_USERNAME,
	PRIVATE_LUZZLE_GOOGLE_AI_API_KEY,
	PRIVATE_LUZZLE_STORAGE_TYPE
} from '$env/static/private'
import {
	StorageWebDAV,
	Pieces,
	Storage,
	pieceFrontMatterFromPrompt,
	StorageFileSystem,
	type PieceFrontmatter,
	type PieceFrontmatterSchema
} from '@luzzle/cli'

const url = PRIVATE_LUZZLE_STORAGE_URL
const root = PRIVATE_LUZZLE_STORAGE_ROOT
const storageType = PRIVATE_LUZZLE_STORAGE_TYPE
const username = PRIVATE_LUZZLE_STORAGE_USERNAME
const password = PRIVATE_LUZZLE_STORAGE_PASSWORD
const apiKey = PRIVATE_LUZZLE_GOOGLE_AI_API_KEY

let pieces: Pieces
let storage: Storage
let types: string[] = []

function getStorage() {
	if (!storage) {
		if (storageType === 'webdav') {
			storage = new StorageWebDAV(url, root, { username, password })
		} else {
			storage = new StorageFileSystem(root)
		}
	}

	return storage
}

function getPieces() {
	if (!storage) {
		storage = getStorage()
		pieces = new Pieces(storage)
	}

	return pieces
}

async function getTypes() {
	if (!types.length && !pieces) {
		types = await getPieces().getTypes()
	}

	return types
}

async function promptToPiece(
	schema: PieceFrontmatterSchema<PieceFrontmatter>,
	prompt: string,
	file?: Buffer[]
) {
	return pieceFrontMatterFromPrompt(apiKey, schema, prompt, file)
}

export { getPieces, getStorage, promptToPiece, getTypes }
