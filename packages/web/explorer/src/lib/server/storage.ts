import { config } from '$lib/server/config'
import { StorageWebDAV, StorageFileSystem, type LuzzleStorage } from '@luzzle/core'

let storage: LuzzleStorage | null = null

export function getStorage(): LuzzleStorage {
	if (storage) {
		return storage
	}

	const storageType = config.storage.type
	const storageConfig = config.storage.config

	if (storageType === 'webdav') {
		if (!storageConfig.url) {
			throw new Error('Config error: storage.config.url is required for webdav storage type.')
		}
		storage = new StorageWebDAV(storageConfig.url, storageConfig.root, {
			username: storageConfig.username,
			password: storageConfig.password
		})
	} else {
		// Default to filesystem
		storage = new StorageFileSystem(storageConfig.root || process.cwd())
	}

	return storage
}
