import { ReadStream, WriteStream } from 'fs'
import type { StorageStat, StorageType } from './types.js'

abstract class LuzzleStorage {
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

export default LuzzleStorage
