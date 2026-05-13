import { describe, test, expect, vi, afterEach } from 'vitest'
import { getStorage } from './storage.js'
import { type Config } from '@luzzle/web.config'
import { StorageFileSystem } from '@luzzle/core'

vi.mock('@luzzle/core')

const mocks = {
	StorageFileSystem: vi.mocked(StorageFileSystem),
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
				root: '/config/path',
			},
		} as unknown as Config

		getStorage(config)
		expect(mocks.StorageFileSystem).toHaveBeenCalledWith('/config/path')
	})
})
