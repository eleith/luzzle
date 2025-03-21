import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { readFile, writeFile, stat, unlink, mkdir, readdir } from 'fs/promises'
import { fdir } from 'fdir'
import {
	createReadStream,
	createWriteStream,
	Dirent,
	existsSync,
	ReadStream,
	Stats,
	WriteStream,
} from 'fs'
import StorageFileSystem from './fs.js'
import { relative, resolve } from 'path'
import { APIBuilder } from 'fdir/dist/builder/api-builder.js'
import { PassThrough } from 'stream'

vi.mock('fs')
vi.mock('path')
vi.mock('fs/promises')
vi.mock('fdir', () => {
	const fdir = vi.fn()
	fdir.prototype = {
		withRelativePaths: vi.fn().mockReturnThis(),
		withDirs: vi.fn().mockReturnThis(),
		crawl: vi.fn().mockImplementation(() => ({
			sync: vi.fn().mockReturnValue([]),
		})),
	}
	return { fdir }
})

const spies: { [key: string]: MockInstance } = {}
const mocks = {
	stat: vi.mocked(stat),
	readFile: vi.mocked(readFile),
	writeFile: vi.mocked(writeFile),
	unlink: vi.mocked(unlink),
	mkdir: vi.mocked(mkdir),
	fdir: vi.mocked(fdir),
	readdir: vi.mocked(readdir),
	createReadStream: vi.mocked(createReadStream),
	createWriteStream: vi.mocked(createWriteStream),
	existsSync: vi.mocked(existsSync),
	relative: vi.mocked(relative),
	resolve: vi.mocked(resolve),
}

describe('lib/storage/fs.ts', () => {
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

		mocks.existsSync.mockReturnValueOnce(true)

		const storage = new StorageFileSystem(root)

		expect(storage.root).toEqual(root)
	})

	test('constructor throws', async () => {
		const root = 'rooot'

		mocks.existsSync.mockReturnValueOnce(false)

		expect(() => new StorageFileSystem(root)).toThrowError()
	})

	test('parseArgPath', async () => {
		const root = '/root/dir'
		const relative = 'relative/path'

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.relative.mockReturnValueOnce(relative)
		const storage = new StorageFileSystem(root)

		const parsedPath = storage.parseArgPath('./path')

		expect(parsedPath).toEqual(relative)
	})

	test('readFile as utf8', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'
		const contents = 'file contents'

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.readFile.mockResolvedValueOnce(contents)
		const storage = new StorageFileSystem(root)

		const file = await storage.readFile('./path', 'text')

		expect(mocks.readFile).toHaveBeenCalledWith(resolve, 'utf8')
		expect(file).toEqual(contents)
	})

	test('readFile as binary', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'
		const contents = 'file contents'

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.readFile.mockResolvedValueOnce(contents)
		const storage = new StorageFileSystem(root)

		const file = await storage.readFile('./path', 'binary')

		expect(mocks.readFile).toHaveBeenCalledWith(resolve, 'binary')
		expect(file).toEqual(contents)
	})

	test('writeFile buffer', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'
		const buffer = Buffer.from('file contents')

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.writeFile.mockResolvedValueOnce(undefined)
		const storage = new StorageFileSystem(root)

		await storage.writeFile('./path', buffer)

		expect(mocks.writeFile).toHaveBeenCalledWith(resolve, buffer, 'binary')
	})

	test('writeFile text', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'
		const contents = 'file contents'

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.writeFile.mockResolvedValueOnce(undefined)
		const storage = new StorageFileSystem(root)

		await storage.writeFile('./path', contents)

		expect(mocks.writeFile).toHaveBeenCalledWith(resolve, contents, 'utf8')
	})

	test('getFilesIn recursive', async () => {
		const root = '/root/dir'
		const dirs = ['dir1', 'dir2']

		mocks.existsSync.mockReturnValueOnce(true)
		spies.fdirSync = vi.spyOn(fdir.prototype, 'crawl').mockImplementation(
			() =>
				({
					withPromise: vi.fn().mockResolvedValueOnce(dirs),
					withRelativePaths: vi.fn().mockReturnThis(),
				}) as unknown as APIBuilder<string[]>
		)

		const storage = new StorageFileSystem(root)
		const results = await storage.getFilesIn('./path', { deep: true })

		expect(spies.fdirSync).toHaveBeenCalled()
		expect(results).toEqual(dirs)
	})

	test('getFilesIn', async () => {
		const root = '/root/dir'
		const dirs = [
			{ name: 'dir1', isFile: () => false },
			{ name: 'file1', isFile: () => true },
		] as Dirent[]

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.readdir.mockResolvedValueOnce(dirs)

		const storage = new StorageFileSystem(root)
		const results = await storage.getFilesIn('./path')

		expect(mocks.readdir).toHaveBeenCalled()
		expect(results).toEqual(['dir1/', 'file1'])
	})

	test('exists', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.stat.mockResolvedValueOnce({} as Stats)

		const storage = new StorageFileSystem(root)
		const result = await storage.exists('./path')

		expect(result).toEqual(true)
	})

	test('delete', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.unlink.mockResolvedValueOnce(undefined)

		const storage = new StorageFileSystem(root)
		await storage.delete('./path')

		expect(mocks.unlink).toHaveBeenCalledOnce()
	})

	test('stat', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'
		const stats = { size: 123, isFile: () => true, mtime: new Date() } as unknown as Stats

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.stat.mockResolvedValueOnce(stats)

		const storage = new StorageFileSystem(root)
		const results = await storage.stat('./path')

		expect(results).toEqual({
			size: stats.size,
			type: 'file',
			last_modified: stats.mtime,
		})
	})

	test('stat on dir', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'
		const stats = { size: 123, isFile: () => false, mtime: new Date() } as unknown as Stats

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.stat.mockResolvedValueOnce(stats)

		const storage = new StorageFileSystem(root)
		const results = await storage.stat('./path')

		expect(results).toEqual({
			size: stats.size,
			type: 'directory',
			last_modified: stats.mtime,
		})
	})

	test('createReadStream', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'
		const stream = new PassThrough() as unknown as ReadStream

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.createReadStream.mockReturnValueOnce(stream)

		const storage = new StorageFileSystem(root)
		const results = storage.createReadStream('./path')

		expect(results).toEqual(stream)
	})

	test('createWritestream', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'
		const stream = new PassThrough() as unknown as WriteStream

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.createWriteStream.mockReturnValueOnce(stream)

		const storage = new StorageFileSystem(root)
		const results = storage.createWriteStream('./path')

		expect(results).toEqual(stream)
	})

	test('makeDirectory', async () => {
		const root = '/root/dir'
		const resolve = 'relative/path'

		mocks.existsSync.mockReturnValueOnce(true)
		mocks.resolve.mockReturnValueOnce(resolve)
		mocks.mkdir.mockResolvedValueOnce('')

		const storage = new StorageFileSystem(root)
		storage.makeDirectory('./path')

		expect(mocks.mkdir).toHaveBeenCalledWith(resolve, { recursive: true })
	})
})
