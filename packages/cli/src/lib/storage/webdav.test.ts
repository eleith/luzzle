import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { createClient, FileStat, WebDAVClient, WebDAVClientOptions } from 'webdav'
import StorageWebDAV from './webdav.js'
import { PassThrough } from 'stream'
import { ReadStream, WriteStream } from 'fs'

vi.mock('stream')
vi.mock('webdav')

const spies: { [key: string]: MockInstance } = {}
const mocks = {
	createClient: vi.mocked(createClient),
}

const mockDavClient = {
	getFileContents: vi.fn(),
	putFileContents: vi.fn(),
	getDirectoryContents: vi.fn(),
	exists: vi.fn(),
	deleteFile: vi.fn(),
	stat: vi.fn(),
	copyFile: vi.fn(),
	moveFile: vi.fn(),
	createDirectory: vi.fn(),
	unlock: vi.fn(),
	search: vi.fn(),
	createReadStream: vi.fn(),
	createWriteStream: vi.fn(),
	customRequest: vi.fn(),
	partialUpdateFileContents: vi.fn(),
	getDAVCompliance: vi.fn(),
	getFileDownloadLink: vi.fn(),
	getFileUploadLink: vi.fn(),
	getHeaders: vi.fn(),
	getQuota: vi.fn(),
	setHeaders: vi.fn(),
	lock: vi.fn(),
} as WebDAVClient

describe('lib/storage/webdav.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('constructor', async () => {
		const root = 'rooot'
		const client = mockDavClient
		const options = {} as WebDAVClientOptions
		const url = 'url'

		mocks.createClient.mockReturnValueOnce(client)

		const storage = new StorageWebDAV('url', root, options)

		expect(storage.root).toEqual(root)
		expect(mocks.createClient).toHaveBeenCalledWith(url, options)
	})

	test('parseArgPath', async () => {
		const root = '/root/dir'
		const argPath = './path'
		const storage = new StorageWebDAV('url', root, {} as WebDAVClientOptions)

		const parsedPath = storage.parseArgPath(argPath)

		expect(parsedPath).toEqual(argPath)
	})

	test('readFile', async () => {
		const filePath = './path'
		const client = mockDavClient
		const fileContents = 'file contents'

		mocks.createClient.mockReturnValueOnce(client)
		spies.getFileContents = vi.spyOn(client, 'getFileContents').mockResolvedValueOnce(fileContents)

		const storage = new StorageWebDAV('url', 'root', {})
		const contents = await storage.readFile(filePath)

		expect(contents).toEqual(fileContents)
		expect(spies.getFileContents).toHaveBeenCalledWith(expect.any(String), { format: 'text' })
	})

	test('writeFile', async () => {
		const filePath = './path'
		const client = mockDavClient
		const fileContents = 'file contents'

		mocks.createClient.mockReturnValueOnce(client)
		spies.putFileContents = vi.spyOn(client, 'putFileContents').mockResolvedValueOnce(true)

		const storage = new StorageWebDAV('url', 'root', {})
		await storage.writeFile(filePath, fileContents)

		expect(spies.putFileContents).toHaveBeenCalledWith(expect.any(String), fileContents)
	})

	test('writeFile', async () => {
		const filePath = './path'
		const client = mockDavClient
		const fileContents = 'file contents'

		mocks.createClient.mockReturnValueOnce(client)
		spies.putFileContents = vi.spyOn(client, 'putFileContents').mockResolvedValueOnce(true)

		const storage = new StorageWebDAV('url', 'root', {})
		await storage.writeFile(filePath, fileContents)

		expect(spies.putFileContents).toHaveBeenCalledWith(expect.any(String), fileContents)
	})

	test('readdir', async () => {
		const filePath = './path'
		const client = mockDavClient
		const directoryContents = [{ filename: 'file' } as FileStat]

		mocks.createClient.mockReturnValueOnce(client)
		spies.getDirectoryContents = vi
			.spyOn(client, 'getDirectoryContents')
			.mockResolvedValueOnce(directoryContents)

		const storage = new StorageWebDAV('url', 'root', {})
		const contents = await storage.readdir(filePath)

		expect(contents).toEqual(directoryContents.map((f) => f.filename))
	})

	test('exists', async () => {
		const filePath = './path'
		const client = mockDavClient

		mocks.createClient.mockReturnValueOnce(client)
		spies.exists = vi.spyOn(client, 'exists').mockResolvedValueOnce(true)

		const storage = new StorageWebDAV('url', 'root', {})
		const test = await storage.exists(filePath)

		expect(test).toEqual(true)
	})

	test('delete', async () => {
		const filePath = './path'
		const client = mockDavClient

		mocks.createClient.mockReturnValueOnce(client)
		spies.delete = vi.spyOn(client, 'deleteFile').mockResolvedValueOnce()

		const storage = new StorageWebDAV('url', 'root', {})
		await storage.delete(filePath)

		expect(spies.delete).toHaveBeenCalled()
	})

	test('stat', async () => {
		const filePath = './path'
		const client = mockDavClient
		const storageStat = {
			size: 12,
			lastmod: new Date().getTime().toString(),
			type: 'file',
			etag: '',
			basename: filePath,
			filename: filePath,
		} as FileStat

		mocks.createClient.mockReturnValueOnce(client)
		spies.stat = vi
			.spyOn(client, 'stat')
			.mockResolvedValueOnce(storageStat)

		const storage = new StorageWebDAV('url', 'root', {})
		const stat = await storage.stat(filePath)

		expect(stat).toEqual({
			size: storageStat.size,
			last_modified: new Date(storageStat.lastmod),
			type: storageStat.type,
		})
	})

	test('createReadStream', async () => {
		const filePath = './path'
		const client = mockDavClient
		const readStream = new PassThrough() as unknown as ReadStream

		mocks.createClient.mockReturnValueOnce(client)
		spies.createReadStream = vi
			.spyOn(client, 'createReadStream')
			.mockReturnValueOnce(readStream)

		const storage = new StorageWebDAV('url', 'root', {})
		const stream = storage.createReadStream(filePath)

		expect(stream).toEqual(readStream)
	})

	test('createWriteStream', async () => {
		const filePath = './path'
		const client = mockDavClient
		const writeStream = new PassThrough() as unknown as WriteStream

		mocks.createClient.mockReturnValueOnce(client)
		spies.createReadStream = vi
			.spyOn(client, 'createWriteStream')
			.mockReturnValueOnce(writeStream)

		const storage = new StorageWebDAV('url', 'root', {})
		const stream = storage.createWriteStream(filePath)

		expect(stream).toEqual(writeStream)
	})

	test('makeDirectory', async () => {
		const filePath = './path'
		const client = mockDavClient

		mocks.createClient.mockReturnValueOnce(client)
		spies.createDirectory = vi
			.spyOn(client, 'createDirectory')
			.mockResolvedValueOnce()

		const storage = new StorageWebDAV('url', 'root', {})
		await storage.makeDirectory(filePath)

		expect(spies.createDirectory).toHaveBeenCalled()
	})
})
