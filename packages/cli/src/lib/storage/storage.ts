import { ReadStream, WriteStream } from 'fs'

export type StorageType = 'fs' | 'webdav'
export type StorageStat = {
	type: 'file' | 'directory'
	size: number
	last_modified: Date
}

abstract class Storage {
	abstract type: StorageType
	abstract root: string
	abstract parseArgPath(path: string): string
	abstract readFile(path: string, format?: 'text'): Promise<string | Buffer>
	abstract writeFile(path: string, contents: string | Buffer | ReadStream): Promise<void>
	abstract getFilesIn(path: string, options?: { deep?: boolean }): Promise<string[]>
	abstract exists(path: string): Promise<boolean>
	abstract delete(path: string): Promise<void>
	abstract stat(path: string): Promise<StorageStat>
	abstract createReadStream(path: string): ReadStream
	abstract createWriteStream(path: string): WriteStream
	abstract makeDirectory(path: string): Promise<void>
}

export default Storage
