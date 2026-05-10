export type StorageType = 'fs'
export type StorageStat = {
	type: 'file' | 'directory'
	size: number
	last_modified: Date
}
