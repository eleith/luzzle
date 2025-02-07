import { Readable, Writable } from "stream"

export type StorageType = 'fs' | 'webdav'
export type StorageStat = {
	type: 'file' | 'directory',
	size: number,
	last_modified: Date,
}

abstract class Storage {
	abstract type: StorageType
	abstract root: string
	abstract parseArgPath(path: string): string
	abstract readFile(path: string, format: 'text' | 'binary'): Promise<string>
	abstract writeFile(path: string, contents: string | Buffer | Readable): Promise<void>
	abstract readdir(path: string): Promise<string[]>
	abstract exists(path: string): Promise<boolean>
	abstract delete(path: string): Promise<void>
	abstract stat(path: string): Promise<StorageStat>
	abstract createReadStream(path: string): Readable
	abstract createWriteStream(path: string): Writable
	abstract makeDirectory(path: string): Promise<void>
}

export default Storage
