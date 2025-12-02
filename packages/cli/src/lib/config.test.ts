import { describe, expect, test, vi, afterEach, MockInstance, MockedClass } from 'vitest'
import Conf from 'conf'
import { getConfig, getDatabasePath, getStorage } from './config.js'
import log from './log.js'
import path from 'path'
import { StorageFileSystem, StorageWebDAV } from '@luzzle/core'

vi.mock('@luzzle/core')
vi.mock('./log.js')
vi.mock('path')
vi.mock('conf', () => {
	const ConfMock = vi.fn()
	ConfMock.prototype.get = vi.fn()
	ConfMock.prototype.set = vi.fn()
	ConfMock.prototype.store = {}
	ConfMock.prototype.path = '/some/path'
	return { default: ConfMock }
})

const mocks = {
	Conf: Conf as MockedClass<typeof Conf>,
	ConfGet: vi.spyOn(Conf.prototype, 'get'),
	ConfSet: vi.spyOn(Conf.prototype, 'set'),
	logWarn: vi.spyOn(log, 'warn'),
	pathResolve: vi.spyOn(path, 'resolve'),
	pathDirname: vi.spyOn(path, 'dirname'),
	pathBasename: vi.spyOn(path, 'basename'),
	pathExtname: vi.spyOn(path, 'extname'),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/config', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('getConfig', async () => {
		getConfig()

		expect(mocks.Conf).toHaveBeenCalledOnce()
		expect(mocks.Conf).not.toHaveBeenCalledWith(expect.objectContaining({ cwd: expect.anything() }))
	})

	test('getConfig with path', async () => {
		const configPath = '/test/dir/config.yaml'
		mocks.pathResolve.mockReturnValueOnce(configPath)
		mocks.pathDirname.mockReturnValueOnce('/test/dir')
		mocks.pathBasename.mockReturnValueOnce('config')
		mocks.pathExtname.mockReturnValueOnce('.yaml')

		getConfig(configPath)

		expect(mocks.Conf).toHaveBeenCalledOnce()
		expect(mocks.Conf).toHaveBeenCalledWith(
			expect.objectContaining({
				cwd: '/test/dir',
				configName: 'config',
				fileExtension: 'yaml',
				projectName: '',
			}),
		)
	})

		test('getDatabasePath', async () => {
		mocks.pathResolve.mockReturnValueOnce('/test/dir/some-path.yaml')
		mocks.pathDirname.mockReturnValueOnce('/test/dir')
		mocks.pathBasename.mockReturnValueOnce('some-path')
		mocks.pathExtname.mockReturnValueOnce('.yaml')
		const config = getConfig('some-path')
		const dbPath = '/db/path/to/here'
		const dbType = 'sqlite'

		mocks.ConfGet.mockReturnValueOnce(dbPath)
		mocks.ConfGet.mockReturnValueOnce(dbType)

		const databasePath = getDatabasePath(config)

		expect(databasePath).toBe(dbPath)
	})

	test('getDatabasePath throws', async () => {
		mocks.pathResolve.mockReturnValueOnce('/test/dir/some-path.yaml')
		mocks.pathDirname.mockReturnValueOnce('/test/dir')
		mocks.pathBasename.mockReturnValueOnce('some-path')
		mocks.pathExtname.mockReturnValueOnce('.yaml')
		const config = getConfig('some-path')
		const dbPath = '/db/path/to/here'
		const dbType = 'postgres'

		mocks.ConfGet.mockReturnValueOnce(dbPath)
		mocks.ConfGet.mockReturnValueOnce(dbType)

		expect(() => getDatabasePath(config)).toThrow()
	})

	test('getStorage type filesystem', async () => {
		mocks.pathResolve.mockReturnValueOnce('/test/dir/some-path.yaml')
		mocks.pathDirname.mockReturnValueOnce('/test/dir')
		mocks.pathBasename.mockReturnValueOnce('some-path')
		mocks.pathExtname.mockReturnValueOnce('.yaml')
		const config = getConfig('some-path')
		const root = 'root'
		const type = 'filesystem'
		const options = undefined

		mocks.ConfGet.mockReturnValueOnce(root)
		mocks.ConfGet.mockReturnValueOnce(type)
		mocks.ConfGet.mockReturnValueOnce(options)

		const storage = getStorage(config)

		expect(storage).toBeInstanceOf(StorageFileSystem)
	})

	test('getStorage type webdav', async () => {
		mocks.pathResolve.mockReturnValueOnce('/test/dir/some-path.yaml')
		mocks.pathDirname.mockReturnValueOnce('/test/dir')
		mocks.pathBasename.mockReturnValueOnce('some-path')
		mocks.pathExtname.mockReturnValueOnce('.yaml')
		const config = getConfig('some-path')
		const root = 'root'
		const type = 'webdav'
		const options = { username: 'a', password: 'p', url: 'u' }

		mocks.ConfGet.mockReturnValueOnce(root)
		mocks.ConfGet.mockReturnValueOnce(type)
		mocks.ConfGet.mockReturnValueOnce(options)

		const storage = getStorage(config)

		expect(storage).toBeInstanceOf(StorageWebDAV)
	})

	test('getStorage invalid type', async () => {
		mocks.pathResolve.mockReturnValueOnce('/test/dir/some-path.yaml')
		mocks.pathDirname.mockReturnValueOnce('/test/dir')
		mocks.pathBasename.mockReturnValueOnce('some-path')
		mocks.pathExtname.mockReturnValueOnce('.yaml')
		const config = getConfig('some-path')
		const root = 'root'
		const type = 'webdax'
		const options = { username: 'a', password: 'p', url: 'u' }

		mocks.ConfGet.mockReturnValueOnce(root)
		mocks.ConfGet.mockReturnValueOnce(type)
		mocks.ConfGet.mockReturnValueOnce(options)

		expect(() => getStorage(config)).toThrowError()
	})
})
