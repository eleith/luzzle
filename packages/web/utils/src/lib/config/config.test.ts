import { describe, expect, test, vi, afterEach } from 'vitest'
import { loadConfig, getConfigValue, setConfigValue, Config } from './config.js'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

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

	test('should load a user config', () => {
		const config = loadConfig(`${import.meta.dirname}/not.user.config.yaml`)
		expect(config).toBeDefined()
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

	describe('Config Environment Substitution', () => {
		const tmpConfigPath = join(tmpdir(), `test-config-${Date.now()}.yaml`)
	
		afterEach(() => {
			try {
				unlinkSync(tmpConfigPath)
			} catch {
				// ignore if file doesn't exist
			}
			vi.unstubAllEnvs()
		})
	
		test('should substitute environment variables', () => {
			vi.stubEnv('TEST_VAR', 'substituted_value')
			const yamlContent = `
auth:
  enabled: true
  secret: '\${TEST_VAR}'
  type: oidc
  oidc:
    issuer: 'https://example.com'
    clientId: 'client'
    clientSecret: 'secret'
`
			writeFileSync(tmpConfigPath, yamlContent)
	
			const config = loadConfig(tmpConfigPath)
			expect(config.auth.secret).toBe('substituted_value')
		})
	
		test('should throw error if environment variable is missing', () => {
			const yamlContent = `
auth:
  enabled: true
  secret: '\${MISSING_VAR}'
  type: oidc
  oidc:
    issuer: 'https://example.com'
    clientId: 'client'
    clientSecret: 'secret'
`
			writeFileSync(tmpConfigPath, yamlContent)
	
			expect(() => loadConfig(tmpConfigPath)).toThrow(/Environment variable "MISSING_VAR" is missing/)
		})
	
		test('should handle escaping with $$', () => {
			vi.stubEnv('TEST_VAR', 'should_not_be_used')
			const yamlContent = `
auth:
  enabled: true
  secret: '$\${TEST_VAR}'
  type: oidc
  oidc:
    issuer: 'https://example.com'
    clientId: 'client'
    clientSecret: 'secret'
`
			writeFileSync(tmpConfigPath, yamlContent)

			const config = loadConfig(tmpConfigPath)
			expect(config.auth.secret).toBe('${TEST_VAR}')
		})
		test('should handle nested objects and arrays', () => {
			vi.stubEnv('VAR_1', 'val1')
			vi.stubEnv('VAR_2', 'val2')
			const yamlContent = `
storage:
  type: webdav
  config:
    root: '\${VAR_1}'
    url: 'http://example.com'
    username: ''
    password: ''
pieces:
  - type: 'book'
    fields:
        title: '\${VAR_2}'
        date_consumed: '2023-01-01'
`
			writeFileSync(tmpConfigPath, yamlContent)
	
			const config = loadConfig(tmpConfigPath)
			expect(config.storage.config.root).toBe('val1')
			expect(config.pieces[0].fields.title).toBe('val2')
		})

		test('should handle ai configuration substitution', () => {
			vi.stubEnv('AI_KEY', 'google-key')
			const yamlContent = `
ai:
  provider: 'google'
  api_key: '\${AI_KEY}'
`
			writeFileSync(tmpConfigPath, yamlContent)

			const config = loadConfig(tmpConfigPath)
			expect(config.ai.api_key).toBe('google-key')
		})
	})
})