import { describe, expect, test, vi, afterEach } from 'vitest'
import { loadConfig, getConfigValue, setConfigValue, Config, ConfigPublic } from './config.js'
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

	test('ConfigPublic should not expose sensitive fields', () => {
		// This is a compile-time check primarily, but we can verify at runtime
		// that the type definition excludes it.
		const config = loadConfig()
		const publicConfig: ConfigPublic = {
			url: config.url,
			content: config.content
		}
		
		// @ts-expect-error - assets should not exist on ConfigPublic
		expect(publicConfig.assets).toBeUndefined()
		// @ts-expect-error - auth should not exist on ConfigPublic
		expect(publicConfig.auth).toBeUndefined()
		// @ts-expect-error - storage should not exist on ConfigPublic
		expect(publicConfig.storage).toBeUndefined()
	})

	test('should load a user config', () => {
		const config = loadConfig(`${import.meta.dirname}/user.config.yaml`)
		expect(config).toBeDefined()
	})

	test('should load a user config', () => {
		const config = loadConfig(`${import.meta.dirname}/not.user.config.yaml`)
		expect(config).toBeDefined()
	})

	test('should handle an empty config file', () => {
		const tmpConfigPath = join(tmpdir(), `empty-config-${Date.now()}.yaml`)
		writeFileSync(tmpConfigPath, '')
		const config = loadConfig(tmpConfigPath)
		expect(config.url.app).toBe('http://localhost:8080')
		unlinkSync(tmpConfigPath)
	})

	test('should throw an error if config validation fails with user config', () => {		expect(() => loadConfig(`${import.meta.dirname}/user-error.config.yaml`)).toThrow(
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
			vi.restoreAllMocks()
		})
	
		test('should substitute environment variables', () => {
			vi.stubEnv('TEST_VAR', 'substituted_value')
			const yamlContent = `
url:
  app: ''
  app_assets: ''
  luzzle_assets: ''
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

		test('should substitute multiple environment variables in one string', () => {
			vi.stubEnv('HOST', 'localhost')
			vi.stubEnv('PORT', '8080')
			const yamlContent = `
url:
  app: 'http://\${HOST}:\${PORT}'
  app_assets: ''
  luzzle_assets: ''
auth:
  enabled: false
  secret: 'secret'
  type: oidc
  oidc:
    issuer: 'https://example.com'
    clientId: 'client'
    clientSecret: 'secret'
`
			writeFileSync(tmpConfigPath, yamlContent)

			const config = loadConfig(tmpConfigPath)
			expect(config.url.app).toBe('http://localhost:8080')
		})
	
		test('should warn and preserve string if environment variable is missing', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
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
	
			const config = loadConfig(tmpConfigPath)
			expect(config.auth.secret).toBe('${MISSING_VAR}')
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Environment variable "MISSING_VAR" is missing'))
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

		test('should handle escaping with $$ in the middle of a string', () => {
			const yamlContent = `
auth:
  enabled: true
  secret: 'Value: $\${TEST_VAR}'
  type: oidc
  oidc:
    issuer: 'https://example.com'
    clientId: 'client'
    clientSecret: 'secret'
`
			writeFileSync(tmpConfigPath, yamlContent)

			const config = loadConfig(tmpConfigPath)
			expect(config.auth.secret).toBe('Value: ${TEST_VAR}')
		})

		test('should use default value if environment variable is missing', () => {
			const yamlContent = `
url:
  app: '\${MISSING_VAR:-http://localhost:8080}'
  app_assets: ''
  luzzle_assets: ''
auth:
  enabled: false
  secret: 'secret'
  type: oidc
  oidc:
    issuer: 'https://example.com'
    clientId: 'client'
    clientSecret: 'secret'
`
			writeFileSync(tmpConfigPath, yamlContent)

			const config = loadConfig(tmpConfigPath)
			expect(config.url.app).toBe('http://localhost:8080')
		})

		test('should handle nested objects and arrays', () => {
			vi.stubEnv('VAR_1', 'val1')
			vi.stubEnv('VAR_2', 'val2')
			const yamlContent = `
storage:
  root: '\${VAR_1}'
pieces:
  - type: 'book'
    fields:
        title: '\${VAR_2}'
        date_consumed: '2023-01-01'
`
			writeFileSync(tmpConfigPath, yamlContent)
	
			const config = loadConfig(tmpConfigPath)
			expect(config.storage.root).toBe('val1')
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
			expect(config.ai?.api_key).toBe('google-key')
		})

		test('should throw error if auth is enabled but secret is empty', () => {
			const yamlContent = `
auth:
  enabled: true
  secret: '\${MISSING_SECRET:-}'
  type: oidc
  oidc:
    issuer: 'https://example.com'
    clientId: 'client'
    clientSecret: 'secret'
`
			writeFileSync(tmpConfigPath, yamlContent)

			expect(() => loadConfig(tmpConfigPath)).toThrow('Configuration validation failed')
		})

		test('should throw error if auth type is credentials but they are empty', () => {
			const yamlContent = `
auth:
  enabled: true
  secret: 'some-secret'
  type: credentials
  credentials:
    username: '\${MISSING_USER:-}'
    password: 'password'
`
			writeFileSync(tmpConfigPath, yamlContent)

			expect(() => loadConfig(tmpConfigPath)).toThrow('Configuration validation failed')
		})
	})

	describe('Builder Configuration', () => {
		const tmpConfigPath = join(tmpdir(), `builder-config-${Date.now()}.yaml`)

		afterEach(() => {
			try {
				unlinkSync(tmpConfigPath)
			} catch {
				// ignore
			}
		})

		test('should validate valid builder config', () => {
			const yamlContent = `
builder:
  url: 'https://builder.example.com'
  method: 'POST'
  headers:
    Authorization: 'Bearer token'
  body: '{}'
`
			writeFileSync(tmpConfigPath, yamlContent)
			const config = loadConfig(tmpConfigPath)
			expect(config.builder?.url).toBe('https://builder.example.com')
			expect(config.builder?.headers?.Authorization).toBe('Bearer token')
		})

		test('should validate builder config with only url', () => {
			const yamlContent = `
builder:
  url: 'https://builder.example.com'
`
			writeFileSync(tmpConfigPath, yamlContent)
			const config = loadConfig(tmpConfigPath)
			expect(config.builder?.url).toBe('https://builder.example.com')
		})
	})
})
