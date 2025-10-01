import { describe, test, vi, afterEach, expect, MockInstance } from 'vitest'
import checkConfig from './index.js'
import { Config, loadConfig } from '../../lib/config/config.js'

vi.mock('../../lib/config/config.js')

const mocks = {
	loadConfig: vi.mocked(loadConfig),
}

const spies: { [key: string]: MockInstance } = {}

describe('src/commands/validate', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('should log success when config is valid', () => {
		mocks.loadConfig.mockReturnValue({} as Config)

		spies.consoleLog = vi.spyOn(console, 'log').mockImplementation(() => { })
		spies.processExit = vi.spyOn(process, 'exit').mockReturnValue(0 as never)

		checkConfig('test')

		expect(mocks.loadConfig).toHaveBeenCalledOnce()
		expect(spies.consoleLog).toHaveBeenCalledOnce()
		expect(spies.processExit).not.toHaveBeenCalled()
	})

	test('should log error and exit when config is invalid', () => {
		mocks.loadConfig.mockImplementation(() => {
			throw new Error('Invalid config')
		})

		spies.consoleError = vi.spyOn(console, 'error').mockImplementation(() => { })
		spies.processExit = vi.spyOn(process, 'exit').mockReturnValue(0 as never)

		checkConfig('test')

		expect(mocks.loadConfig).toHaveBeenCalledOnce()
		expect(spies.consoleError).toHaveBeenCalledOnce()
		expect(spies.processExit).toHaveBeenCalledWith(1)
	})
})
