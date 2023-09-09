import { describe, expect, test, vi, afterEach, SpyInstance, MockedClass } from 'vitest'
import Conf from 'conf'
import { existsSync } from 'fs'
import { getConfig, getDirectoryFromConfig, SchemaConfig } from './config.js'

vi.mock('fs')
vi.mock('conf', () => {
	const ConfMock = vi.fn()
	ConfMock.prototype.get = vi.fn()
	ConfMock.prototype.set = vi.fn()
	return { default: ConfMock }
})

const mocks = {
	Conf: Conf as MockedClass<typeof Conf>,
	ConfGet: vi.spyOn(Conf.prototype, 'get'),
	ConfSet: vi.spyOn(Conf.prototype, 'set'),
	existsSync: vi.mocked(existsSync),
}

const spies: { [key: string]: SpyInstance } = {}

describe('tools/lib/config', () => {
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
		getConfig('special-path')
		expect(mocks.Conf).toHaveBeenCalledOnce()
		expect(mocks.Conf).toHaveBeenCalledWith(expect.objectContaining({ cwd: 'special-path' }))
	})

	test('getDirectoryFromConfig', async () => {
		const config = new Conf<SchemaConfig>()
		const dirPath = '/some/dir'
		const dirUrlPath = `file://${dirPath}`

		mocks.ConfGet.mockReturnValue(dirUrlPath)
		mocks.existsSync.mockReturnValue(true)

		const directory = getDirectoryFromConfig(config)

		expect(mocks.ConfGet).toHaveBeenCalledWith('directory')
		expect(directory).toBe(dirPath)
	})

	test('getDirectoryFromConfig fails with a non existant directory', async () => {
		const config = new Conf<SchemaConfig>()
		const dirPath = '/some/dir'
		const dirUrlPath = `file://${dirPath}`

		mocks.ConfGet.mockReturnValue(dirUrlPath)
		mocks.existsSync.mockReturnValue(false)

		expect(() => getDirectoryFromConfig(config)).toThrow()
	})
})
