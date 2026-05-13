import { describe, test, expect, vi, afterEach } from 'vitest'
import { getConfig } from './config.js'
import { loadConfig, type Config } from '@luzzle/web.config'
import { existsSync } from 'fs'
import path from 'path'

vi.mock('@luzzle/web.config')
vi.mock('fs')

const mocks = {
	loadConfig: vi.mocked(loadConfig),
	existsSync: vi.mocked(existsSync),
}

describe('lib/config', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should return config when configPath is provided and exists', () => {
		const configPath = 'my-config.yaml'
		const resolvedPath = path.resolve(configPath)
		const expectedConfig = { paths: { database: 'db.sqlite' } } as Config

		mocks.existsSync.mockReturnValue(true) 
		mocks.loadConfig.mockReturnValue(expectedConfig)

		const result = getConfig(configPath)

		expect(result).toBe(expectedConfig)
		expect(mocks.existsSync).toHaveBeenCalledWith(resolvedPath)
		expect(mocks.loadConfig).toHaveBeenCalledWith(resolvedPath)
	})

	test('should return config from default path when no configPath is provided', () => {
		const resolvedDefaultPath = path.resolve(process.cwd(), 'config.yaml')
		const expectedConfig = { paths: { database: 'db.sqlite' } } as Config

		mocks.existsSync.mockReturnValue(true)
		mocks.loadConfig.mockReturnValue(expectedConfig)

		const result = getConfig()

		expect(result).toBe(expectedConfig)
		expect(mocks.existsSync).toHaveBeenCalledWith(resolvedDefaultPath)
		expect(mocks.loadConfig).toHaveBeenCalledWith(resolvedDefaultPath)
	})

	test('should throw error if config file does not exist', () => {
		mocks.existsSync.mockReturnValue(false)

		expect(() => getConfig('missing.yaml')).toThrow(/Config file not found/)
	})
})
