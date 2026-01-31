import { describe, test, expect, vi, afterEach } from 'vitest'
import { getStorage } from './storage.js'
import { type Config } from '@luzzle/web.utils'
import { StorageFileSystem, StorageWebDAV } from '@luzzle/core'

vi.mock('@luzzle/core')

const mocks = {
	StorageFileSystem: vi.mocked(StorageFileSystem),
	StorageWebDAV: vi.mocked(StorageWebDAV),
}

describe('lib/storage', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should return StorageFileSystem when luzzleDir is provided', () => {
		const config = {} as Config
		getStorage(config, '/custom/path')
		expect(mocks.StorageFileSystem).toHaveBeenCalledWith('/custom/path')
	})

	test('should return StorageFileSystem from config', () => {
		const config = {
			storage: {
				type: 'filesystem',
				config: { root: '/config/path' },
			},
		} as unknown as Config

		getStorage(config)
		expect(mocks.StorageFileSystem).toHaveBeenCalledWith('/config/path')
	})

	test('should return StorageWebDAV from config', () => {
		const config = {
			storage: {
				type: 'webdav',
				config: {
					url: 'http://webdav.com',
					root: '/remote',
					username: 'user',
					password: 'pass',
				},
			},
		} as unknown as Config

		getStorage(config)
		expect(mocks.StorageWebDAV).toHaveBeenCalledWith('http://webdav.com', '/remote', {
			username: 'user',
			password: 'pass',
		})
	})

	test('should throw error for WebDAV without URL', () => {
		const config = {
			storage: {
				type: 'webdav',
				config: {
					root: '/remote',
				},
			},
		} as unknown as Config

		expect(() => getStorage(config)).toThrow('WebDAV storage requires a URL')
	})
})
