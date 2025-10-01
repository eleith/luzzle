import { describe, expect, test } from 'vitest'
import { loadConfig } from './config.js'

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

	test('should throw an error if config validation fails', () => {
		expect(() => loadConfig(`${import.meta.dirname}/user-error.config.yaml`)).toThrow()
	})
})
