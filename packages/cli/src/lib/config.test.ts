import { describe, expect, test, vi, afterEach, MockInstance, MockedClass } from 'vitest'
import Conf from 'conf'
import { existsSync } from 'fs'
import { getConfig, getDirectoryFromConfig, SchemaConfig } from './config.js'
import log from './log.js'
import path from 'path'

vi.mock('fs')
vi.mock('./log.js')
vi.mock('conf', () => {
	const ConfMock = vi.fn()
	ConfMock.prototype.get = vi.fn()
	ConfMock.prototype.set = vi.fn()
	ConfMock.prototype.path = '/some/path'
	return { default: ConfMock }
})

const mocks = {
	Conf: Conf as MockedClass<typeof Conf>,
	ConfGet: vi.spyOn(Conf.prototype, 'get'),
	ConfSet: vi.spyOn(Conf.prototype, 'set'),
	existsSync: vi.mocked(existsSync),
	logWarn: vi.spyOn(log, 'warn'),
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

	test('getDirectoryFromConfig when directory is not set', async () => {
		const config = new Conf<SchemaConfig>()

		mocks.ConfGet.mockReturnValue(null)

		const directory = getDirectoryFromConfig(config)

		expect(mocks.ConfGet).toHaveBeenCalledWith('directory')
		expect(directory).toBe(path.dirname(config.path))
		expect(mocks.logWarn).toHaveBeenCalledOnce()
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
