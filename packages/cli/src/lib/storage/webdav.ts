import { Readable } from 'stream'
import Storage, { StorageStat, type StorageType } from './storage.js'
import { createClient, WebDAVClient, WebDAVClientOptions, FileStat } from 'webdav'
import path from 'path'
import { ReadStream, WriteStream } from 'fs'

class StorageWebDAV extends Storage {
	private _webdavClient: WebDAVClient

	type: StorageType = 'webdav'
	root: string

	constructor(url: string, root: string, options: WebDAVClientOptions) {
		super()
		this.root = root
		this._webdavClient = createClient(url, options)
	}

	private buildPath(_path: string) {
		return path.join(this.root, _path)
	}

	parseArgPath(argPath: string) {
		return argPath
	}

	async readFile(path: string, format: 'text' | 'binary' = 'text') {
		const fullPath = this.buildPath(path)
		return this._webdavClient.getFileContents(fullPath, { format }) as Promise<string>
	}

	async writeFile(path: string, contents: string | Buffer | Readable) {
		const fullPath = this.buildPath(path)
		this._webdavClient.putFileContents(fullPath, contents)
	}

	async getFilesIn(dir: string, options?: { deep?: boolean }) {
		const fullPath = this.buildPath(dir)

		return this._webdavClient
			.getDirectoryContents(fullPath, options)
			.then((contents) =>
				(contents as FileStat[]).map(
					(content) =>
						`${path.relative(fullPath, content.filename)}${content.type === 'file' ? '' : '/'}`
				)
			)
	}

	async exists(path: string) {
		const fullPath = this.buildPath(path)
		return this._webdavClient.exists(fullPath)
	}

	async delete(path: string) {
		const fullPath = this.buildPath(path)
		this._webdavClient.deleteFile(fullPath)
	}

	async stat(path: string) {
		const fullPath = this.buildPath(path)
		const stats = (await this._webdavClient.stat(fullPath)) as FileStat
		const storageStat: StorageStat = {
			size: stats.size,
			last_modified: new Date(stats.lastmod),
			type: stats.type,
		}
		return storageStat
	}

	createReadStream(path: string) {
		const fullPath = this.buildPath(path)
		return this._webdavClient.createReadStream(fullPath) as ReadStream
	}

	createWriteStream(path: string) {
		const fullPath = this.buildPath(path)
		return this._webdavClient.createWriteStream(fullPath) as WriteStream
	}

	async makeDirectory(path: string) {
		const fullPath = this.buildPath(path)
		this._webdavClient.createDirectory(fullPath, { recursive: true })
	}
}

export default StorageWebDAV
