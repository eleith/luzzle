import { describe, expect, test } from 'vitest'
import { loadConfig, getConfigValue, setConfigValue, Config } from './config.js'

interface TestConfig extends Config {
  a: {
    b: {
      c: string
    }
  }
}

describe('lib/config/config', () => {
	test('should validate default config against schema', async () => {
		try {
			const config = loadConfig()
			expect(config).toBeDefined()
		} catch (e) {
			if (e) {
				expect(e).toBeUndefined()
			}
		}
	})

	test('should load a user config', () => {
		const config = loadConfig(`${import.meta.dirname}/user.config.yaml`)
		expect(config).toBeDefined()
	})

	test('should throw an error if user config is not found', () => {
		expect(() => loadConfig(`${import.meta.dirname}/non.existant.config.yaml`)).toThrow()
	})

	test('should throw an error if config validation fails with user config', () => {
		expect(() => loadConfig(`${import.meta.dirname}/user-error.config.yaml`)).toThrow(
			'Configuration validation failed'
		)
	})

	describe('getConfigValue', () => {
		test('should return the correct value for a given path', () => {
			const config = {
				a: {
					b: {
						c: 'value'
					}
				}
			} as unknown as TestConfig
			const value = getConfigValue(config, 'a.b.c')
			expect(value).toBe('value')
		})

		test('should return undefined for a non-existent path', () => {
			const config = {
				a: {
					b: {
						c: 'value'
					}
				}
			} as unknown as TestConfig
			const value = getConfigValue(config, 'a.b.d')
			expect(value).toBeUndefined()
		})
	})

	describe('setConfigValue', () => {
		test('should correctly set a value at a given path', () => {
			const config = {
				a: {
					b: {
						c: 'value'
					}
				}
			} as unknown as TestConfig
			setConfigValue(config, 'a.b.c', 'new-value')
			expect(config.a.b.c).toBe('new-value')
		})

		test('should create intermediate objects if they don\'t exist', () => {
			const config = {
				a: {}
			} as unknown as TestConfig
			setConfigValue(config, 'a.b.c', 'value')
			expect(config.a.b.c).toBe('value')
		})
	})
})

