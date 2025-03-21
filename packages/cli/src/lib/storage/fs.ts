import { readFile, writeFile, stat, unlink, mkdir, readdir } from 'fs/promises'
import { fdir } from 'fdir'
import { createReadStream, createWriteStream, existsSync } from 'fs'
import Storage, { StorageStat, type StorageType } from './storage.js'
import path from 'path'
import { Readable } from 'stream'

class StorageFileSystem extends Storage {
	type: StorageType = 'fs'
	root: string

	constructor(root: string) {
		super()
		this.root = root

		if (!existsSync(this.root)) {
			throw new Error(`root directory ${this.root} not found`)
		}
	}

	private resolvePath(_path: string) {
		return path.resolve(this.root, _path)
	}

	parseArgPath(argPath: string) {
		return path.relative(this.root, argPath)
	}

	async readFile(path: string, format: 'text' | 'binary' = 'text') {
		const resolvedPath = this.resolvePath(path)
		return readFile(resolvedPath, format === 'text' ? 'utf8' : 'binary')
	}

	async writeFile(path: string, contents: string | Buffer | Readable): Promise<void> {
		const resolvedPath = this.resolvePath(path)

		if (Buffer.isBuffer(contents)) {
			writeFile(resolvedPath, contents, 'binary')
		} else {
			writeFile(resolvedPath, contents, 'utf8')
		}
	}

	async getFilesIn(dir: string, options?: { deep?: boolean }) {
		const resolvedPath = this.resolvePath(dir)

		if (options?.deep) {
			return new fdir().withRelativePaths().crawl(resolvedPath).withPromise()
		} else {
			const files = await readdir(resolvedPath, { withFileTypes: true })
			return files.map((file) => (file.isFile() ? file.name : file.name + '/'))
		}
	}

	async exists(path: string) {
		const resolvedPath = this.resolvePath(path)
		return stat(resolvedPath)
			.catch(() => null)
			.then(Boolean)
	}

	async delete(path: string) {
		const resolvedPath = this.resolvePath(path)
		unlink(resolvedPath)
	}

	async stat(path: string) {
		const resolvedPath = this.resolvePath(path)
		const stats = await stat(resolvedPath)
		const storageStat: StorageStat = {
			size: stats.size,
			type: stats.isFile() ? 'file' : 'directory',
			last_modified: stats.mtime,
		}

		return storageStat
	}

	createReadStream(path: string) {
		const resolvedPath = this.resolvePath(path)
		return createReadStream(resolvedPath)
	}

	createWriteStream(path: string) {
		const resolvedPath = this.resolvePath(path)
		return createWriteStream(resolvedPath)
	}

	async makeDirectory(path: string) {
		const resolvedPath = this.resolvePath(path)
		await mkdir(resolvedPath, { recursive: true })
	}
}

export default StorageFileSystem
