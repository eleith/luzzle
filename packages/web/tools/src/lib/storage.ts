import { type Config } from '@luzzle/web.utils'
import { StorageFileSystem, StorageWebDAV, type LuzzleStorage } from '@luzzle/core'

export function getStorage(config: Config, luzzleDir?: string): LuzzleStorage {
	if (luzzleDir) {
		return new StorageFileSystem(luzzleDir)
	}

	const storageConfig = config.storage

	if (storageConfig.type === 'webdav') {
		const { url, username, password, root } = storageConfig.config
		if (!url) {
			throw new Error('WebDAV storage requires a URL')
		}
		return new StorageWebDAV(url, root, { username, password })
	}

	return new StorageFileSystem(storageConfig.config.root)
}
