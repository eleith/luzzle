import { describe, expect, test } from 'vitest'
import {
	loadConfig,
	getConfigValue,
	setConfigValue,
	type ConfigPublic,
} from './index.js'

describe('index (package entry point)', () => {
	test('should export loadConfig as a function', () => {
		expect(typeof loadConfig).toBe('function')
	})

	test('should export getConfigValue as a function', () => {
		expect(typeof getConfigValue).toBe('function')
	})

	test('should export setConfigValue as a function', () => {
		expect(typeof setConfigValue).toBe('function')
	})

	test('should export Config type (compile-time check)', () => {
		const config = loadConfig()
		expect(config.url).toBeDefined()
		expect(config.auth).toBeDefined()
		expect(config.storage).toBeDefined()
	})

	test('should export ConfigPublic type (compile-time check)', () => {
		const config = loadConfig()
		const publicConfig: ConfigPublic = {
			url: config.url,
			content: config.content,
		}
		expect(publicConfig.url.app).toBeDefined()
		expect(publicConfig.content.text.title).toBeDefined()
	})
})
