import { describe, expect, test, vi, afterEach } from 'vitest'
import type { Config, ConfigPublic } from './config.js';
import { loadConfig, getConfigValue, setConfigValue } from './config.js'
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

		test('should return the value for a root-level key', () => {
			const config = {
				key: 'value'
			} as unknown as TestConfig
			const value = getConfigValue(config, 'key')
			expect(value).toBe('value')
		})

		test('should return an object for a path to a non-leaf', () => {
			const config = {
				a: {
					b: {
						c: 'value'
					}
				}
			} as unknown as TestConfig
			const value = getConfigValue(config, 'a.b')
			expect(value).toEqual({ c: 'value' })
		})

		test('should return undefined for a path starting with a non-existent key', () => {
			const config = {
				a: {
					b: 'value'
				}
			} as unknown as TestConfig
			const value = getConfigValue(config, 'x.y.z')
			expect(value).toBeUndefined()
		})

		test('should return undefined for an empty config', () => {
			const config = {} as unknown as TestConfig
			const value = getConfigValue(config, 'a.b')
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

		test('should set a value at a root-level key', () => {
			const config = {} as unknown as Record<string, unknown>
			setConfigValue(config as unknown as TestConfig, 'key', 'value')
			expect(config.key).toBe('value')
		})

		test('should overwrite non-object intermediate when setting a nested path', () => {
			const config = {
				a: {
					b: 'not-an-object'
				}
			} as unknown as TestConfig
			setConfigValue(config, 'a.b.c', 'value')
			expect((config as unknown as { a: { b: { c: string } } }).a.b.c).toBe('value')
		})

		test('should set a value to null', () => {
			const config = {
				a: {
					b: {
						c: 'value'
					}
				}
			} as unknown as TestConfig
			setConfigValue(config, 'a.b.c', null)
			expect(config.a.b.c).toBeNull()
		})

		test('should set a value to a number', () => {
			const config = {
				a: {
					b: {
						c: 'value'
					}
				}
			} as unknown as TestConfig
			setConfigValue(config, 'a.b.c', 42)
			expect(config.a.b.c).toBe(42)
		})

		test('should create deeply nested objects from scratch', () => {
			const config = {} as unknown as TestConfig
			setConfigValue(config, 'a.b.c.d.e', 'deep')
			expect((config as unknown as { a: { b: { c: { d: { e: string } } } } }).a.b.c.d.e).toBe('deep')
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

	describe('Config paths tracking', () => {
		const tmpConfigPath = join(tmpdir(), `paths-config-${Date.now()}.yaml`)

		afterEach(() => {
			try {
				unlinkSync(tmpConfigPath)
			} catch {
				// ignore
			}
		})

		test('should set paths.config when userConfigPath is provided', () => {
			const yamlContent = `
url:
  app: 'https://example.com'
`
			writeFileSync(tmpConfigPath, yamlContent)
			const config = loadConfig(tmpConfigPath)
			expect(config.paths.config).toBe(tmpConfigPath)
		})

		test('should not set paths.config when no userConfigPath is provided', () => {
			const config = loadConfig()
			expect(config.paths.config).toBeUndefined()
		})
	})

	describe('Default values verification', () => {
		test('should set correct default values for content.text', () => {
			const config = loadConfig()
			expect(config.content.text.title).toBe('Luzzle Explorer')
			expect(config.content.text.description).toBe('A Luzzle Explorer instance')
		})

		test('should set correct default for storage.root', () => {
			const config = loadConfig()
			expect(config.storage.root).toBe('./archive')
		})

		test('should set correct default for paths.database', () => {
			const config = loadConfig()
			expect(config.paths.database).toBe('./data/luzzle.sqlite')
		})

		test('should set correct default for paths.assets', () => {
			const config = loadConfig()
			expect(config.paths.assets).toBe('./assets/pieces')
		})

		test('should set correct default for paths.cache', () => {
			const config = loadConfig()
			expect(config.paths.cache).toBe('./nginx')
		})

		test('should set correct default for auth', () => {
			const config = loadConfig()
			expect(config.auth.enabled).toBe(false)
			expect(config.auth.type).toBe('oidc')
		})

		test('should set correct default for assets.salt', () => {
			const config = loadConfig()
			expect(config.assets.salt).toBe('')
		})

		test('should set correct default theme values', () => {
			const config = loadConfig()
			expect(config.theme.light['color-primary']).toBe('#0d6efd')
			expect(config.theme.dark['color-primary']).toBe('#3b82f6')
			expect(config.theme.globals['font-size-root']).toBe(22)
			expect(config.theme.markdown.code.light).toBe('github-light')
			expect(config.theme.markdown.code.dark).toBe('github-dark')
		})
	})

	describe('Environment substitution edge cases', () => {
		const tmpConfigPath = join(tmpdir(), `env-edge-config-${Date.now()}.yaml`)

		afterEach(() => {
			try {
				unlinkSync(tmpConfigPath)
			} catch {
				// ignore
			}
			vi.unstubAllEnvs()
			vi.restoreAllMocks()
		})

		test('should handle empty string env var value', () => {
			vi.stubEnv('EMPTY_VAR', '')
			const yamlContent = `
url:
  app: '\${EMPTY_VAR}'
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
			expect(config.url.app).toBe('')
		})

		test('should handle default value with colons (URL-like)', () => {
			const yamlContent = `
url:
  app: '\${MISSING_URL:-http://localhost:8080/path?query=1}'
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
			expect(config.url.app).toBe('http://localhost:8080/path?query=1')
		})

		test('should leave strings without env vars unchanged', () => {
			const yamlContent = `
url:
  app: 'just-a-plain-string'
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
			expect(config.url.app).toBe('just-a-plain-string')
		})

		test('should substitute env var in nested object within array', () => {
			vi.stubEnv('PIECE_FIELD_TITLE', 'My Title')
			const yamlContent = `
pieces:
  - type: 'book'
    fields:
      title: '\${PIECE_FIELD_TITLE}'
      date_consumed: '2023-01-01'
`
			writeFileSync(tmpConfigPath, yamlContent)
			const config = loadConfig(tmpConfigPath)
			expect(config.pieces[0].fields.title).toBe('My Title')
		})

		test('should substitute same env var in multiple places', () => {
			vi.stubEnv('SHARED_VAR', 'shared')
			const yamlContent = `
url:
  app: '\${SHARED_VAR}'
  app_assets: '\${SHARED_VAR}'
  luzzle_assets: '\${SHARED_VAR}'
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
			expect(config.url.app).toBe('shared')
			expect(config.url.app_assets).toBe('shared')
			expect(config.url.luzzle_assets).toBe('shared')
		})

		test('should not substitute env vars in non-string values', () => {
			vi.stubEnv('APP_URL', 'https://example.com')
			const yamlContent = `
url:
  app: '\${APP_URL}'
  app_assets: ''
  luzzle_assets: ''
`
			writeFileSync(tmpConfigPath, yamlContent)
			const config = loadConfig(tmpConfigPath)
			expect(config.url.app).toBe('https://example.com')
			expect(config.auth.enabled).toBe(false)
			expect(config.theme.globals['font-size-root']).toBe(22)
		})
	})

	describe('Schema validation errors', () => {
		const tmpConfigPath = join(tmpdir(), `schema-error-config-${Date.now()}.yaml`)

		afterEach(() => {
			try {
				unlinkSync(tmpConfigPath)
			} catch {
				// ignore
			}
		})

		test('should throw for invalid auth type', () => {
			const yamlContent = `
url:
  app: 'https://example.com'
  app_assets: ''
  luzzle_assets: ''
auth:
  enabled: false
  secret: 'secret'
  type: invalid_type
`
			writeFileSync(tmpConfigPath, yamlContent)
			expect(() => loadConfig(tmpConfigPath)).toThrow('Configuration validation failed')
		})

		test('should throw for storage.root with empty string', () => {
			const yamlContent = `
storage:
  root: ''
`
			writeFileSync(tmpConfigPath, yamlContent)
			expect(() => loadConfig(tmpConfigPath)).toThrow('Configuration validation failed')
		})

		test('should throw for ai.api_key with empty string when ai is present', () => {
			const yamlContent = `
ai:
  provider: google
  api_key: ''
`
			writeFileSync(tmpConfigPath, yamlContent)
			expect(() => loadConfig(tmpConfigPath)).toThrow('Configuration validation failed')
		})

		test('should throw for invalid theme code enum value', () => {
			const yamlContent = `
theme:
  markdown:
    code:
      light: invalid_theme_name
      dark: github-dark
`
			writeFileSync(tmpConfigPath, yamlContent)
			expect(() => loadConfig(tmpConfigPath)).toThrow('Configuration validation failed')
		})
	})

	describe('Complex config loading', () => {
		const tmpConfigPath = join(tmpdir(), `complex-config-${Date.now()}.yaml`)

		afterEach(() => {
			try {
				unlinkSync(tmpConfigPath)
			} catch {
				// ignore
			}
		})

		test('should load config with multiple pieces', () => {
			const yamlContent = `
pieces:
  - type: 'book'
    fields:
      title: 'Book One'
      date_consumed: '2023-01-01'
  - type: 'video'
    fields:
      title: 'Video One'
      date_consumed: '2023-02-01'
      media:
        - image
`
			writeFileSync(tmpConfigPath, yamlContent)
			const config = loadConfig(tmpConfigPath)
			expect(config.pieces).toHaveLength(2)
			expect(config.pieces[0].type).toBe('book')
			expect(config.pieces[1].type).toBe('video')
			expect(config.pieces[1].fields.media).toEqual(['image'])
		})

		test('should load config with all optional sections', () => {
			const yamlContent = `
url:
  app: 'https://example.com'
  app_assets: 'https://assets.example.com'
  luzzle_assets: 'https://luzzle.example.com'
auth:
  enabled: true
  secret: 'super-secret-key'
  type: oidc
  oidc:
    issuer: 'https://auth.example.com'
    clientId: 'my-client'
    clientSecret: 'my-client-secret'
sync:
  config: '/custom/rclone.conf'
  archive:
    remote: 's3://archive-bucket'
    path: '/archive/path'
  cdn:
    remote: 's3://cdn-bucket'
    path: '/cdn/path'
`
			writeFileSync(tmpConfigPath, yamlContent)
			const config = loadConfig(tmpConfigPath)
			expect(config.url.app).toBe('https://example.com')
			expect(config.auth.secret).toBe('super-secret-key')
			expect(config.auth.oidc?.name).toBe('Single Sign-On')
			expect(config.auth.oidc?.issuer).toBe('https://auth.example.com')
			expect(config.sync.config).toBe('/custom/rclone.conf')
			expect(config.sync.archive?.remote).toBe('s3://archive-bucket')
			expect(config.sync.archive?.path).toBe('/archive/path')
			expect(config.sync.cdn?.remote).toBe('s3://cdn-bucket')
			expect(config.sync.cdn?.path).toBe('/cdn/path')
		})

		test('should allow custom oidc.name', () => {
			const yamlContent = `
url:
  app: 'https://example.com'
  app_assets: ''
  luzzle_assets: ''
auth:
  enabled: true
  secret: 'secret'
  type: oidc
  oidc:
    name: 'Okta SSO'
    issuer: 'https://auth.example.com'
    clientId: 'client'
    clientSecret: 'secret'
`
			writeFileSync(tmpConfigPath, yamlContent)
			const config = loadConfig(tmpConfigPath)
			expect(config.auth.oidc?.name).toBe('Okta SSO')
		})
	})

	describe('Sync Configuration', () => {
		test('should default sync.archive and sync.cdn when absent', () => {
			const config = loadConfig()
			expect(config.sync.archive?.remote).toBe('')
			expect(config.sync.archive?.path).toBe('')
			expect(config.sync.cdn?.remote).toBe('')
			expect(config.sync.cdn?.path).toBe('')
		})
	})

	describe('Worker Configuration', () => {
		const tmpConfigPath = join(tmpdir(), `worker-config-${Date.now()}.yaml`)

		afterEach(() => {
			try {
				unlinkSync(tmpConfigPath)
			} catch {
				// ignore
			}
		})

		test('should default worker.queue.path when absent', () => {
			const config = loadConfig()
			expect(config.worker?.queue?.path).toBe('./data/sidequest.sqlite')
		})

		test('should accept a custom worker.queue.path', () => {
			const yamlContent = `
worker:
  queue:
    path: '/custom/sidequest.db'
`
			writeFileSync(tmpConfigPath, yamlContent)
			const config = loadConfig(tmpConfigPath)
			expect(config.worker?.queue?.path).toBe('/custom/sidequest.db')
		})
	})
})
