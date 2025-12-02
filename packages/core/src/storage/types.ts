export type StorageType = 'fs' | 'webdav'
export type StorageStat = {
	type: 'file' | 'directory'
	size: number
	last_modified: Date
}
