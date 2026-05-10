import { config } from '$lib/server/config'
import { StorageFileSystem, type LuzzleStorage } from '@luzzle/core'

let storage: LuzzleStorage | null = null

export function getStorage(): LuzzleStorage {
	if (storage) {
		return storage
	}

	storage = new StorageFileSystem(config.storage.root || process.cwd())

	return storage
}
