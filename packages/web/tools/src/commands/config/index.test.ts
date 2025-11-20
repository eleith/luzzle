import { describe, test, vi, afterEach, expect, MockInstance } from 'vitest'
import { getHandler, setHandler, validateHandler } from './index.js'
import { getConfigValue, setConfigValue, loadConfig, Config } from '../../lib/config/config.js'
import { writeFileSync } from 'fs'
import yaml from 'yaml'

vi.mock('../../lib/config/config.js')
vi.mock('fs')
vi.mock('yaml')

const mocks = {
  getConfigValue: vi.mocked(getConfigValue),
  setConfigValue: vi.mocked(setConfigValue),
  loadConfig: vi.mocked(loadConfig),
  writeFileSync: vi.mocked(writeFileSync),
  yamlStringify: vi.spyOn(yaml, 'stringify')
}

const spies: { [key: string]: MockInstance } = {}

describe('src/commands/config', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('validateHandler', () => {
    test('should log success when config is valid', () => {
      mocks.loadConfig.mockReturnValue({} as Config)

      spies.consoleLog = vi.spyOn(console, 'log').mockImplementation(() => { })
      spies.processExit = vi.spyOn(process, 'exit').mockReturnValue(0 as never)

      validateHandler('test')

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

      validateHandler('test')

      expect(mocks.loadConfig).toHaveBeenCalledOnce()
      expect(spies.consoleError).toHaveBeenCalledOnce()
      expect(spies.processExit).toHaveBeenCalledWith(1)
    })
  })

  describe('getHandler', () => {
    test('should log the value when the path is valid', () => {
      mocks.loadConfig.mockReturnValue({} as Config)
      mocks.getConfigValue.mockReturnValue('test-value')

      spies.consoleLog = vi.spyOn(console, 'log').mockImplementation(() => { })

      getHandler('test', 'test.path')

      expect(mocks.loadConfig).toHaveBeenCalledOnce()
      expect(mocks.getConfigValue).toHaveBeenCalledOnce()
      expect(spies.consoleLog).toHaveBeenCalledOnce()
    })

    test('should log error and exit when the path is invalid', () => {
      mocks.loadConfig.mockReturnValue({} as Config)
      mocks.getConfigValue.mockImplementation(() => {
        throw new Error('Invalid path')
      })

      spies.consoleError = vi.spyOn(console, 'error').mockImplementation(() => { })
      spies.processExit = vi.spyOn(process, 'exit').mockReturnValue(0 as never)

      getHandler('test', 'test.path')

      expect(mocks.loadConfig).toHaveBeenCalledOnce()
      expect(mocks.getConfigValue).toHaveBeenCalledOnce()
      expect(spies.consoleError).toHaveBeenCalledOnce()
      expect(spies.processExit).toHaveBeenCalledWith(1)
    })
  })

  describe('setHandler', () => {
    test('should write the updated config to the file', () => {
      mocks.loadConfig.mockReturnValue({} as Config)
      mocks.yamlStringify.mockReturnValue('test-config')

      spies.consoleLog = vi.spyOn(console, 'log').mockImplementation(() => { })

      setHandler('test', 'test.path', 'test-value')

      expect(mocks.loadConfig).toHaveBeenCalledOnce()
      expect(mocks.setConfigValue).toHaveBeenCalledOnce()
      expect(mocks.writeFileSync).toHaveBeenCalledOnce()
      expect(spies.consoleLog).toHaveBeenCalledOnce()
    })

    test('should log error and exit when the value cannot be set', () => {
      mocks.loadConfig.mockReturnValue({} as Config)
      mocks.setConfigValue.mockImplementation(() => {
        throw new Error('Invalid value')
      })

      spies.consoleError = vi.spyOn(console, 'error').mockImplementation(() => { })
      spies.processExit = vi.spyOn(process, 'exit').mockReturnValue(0 as never)

      setHandler('test', 'test.path', 'test-value')

      expect(mocks.loadConfig).toHaveBeenCalledOnce()
      expect(mocks.setConfigValue).toHaveBeenCalledOnce()
      expect(spies.consoleError).toHaveBeenCalledOnce()
      expect(spies.processExit).toHaveBeenCalledWith(1)
    })
  })
})