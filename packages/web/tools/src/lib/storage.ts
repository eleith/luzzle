import { type Config } from '@luzzle/web.utils'
import { StorageFileSystem, type LuzzleStorage } from '@luzzle/core'

export function getStorage(config: Config, luzzleDir?: string): LuzzleStorage {
	if (luzzleDir) {
		return new StorageFileSystem(luzzleDir)
	}

	return new StorageFileSystem(config.storage.root)
}
