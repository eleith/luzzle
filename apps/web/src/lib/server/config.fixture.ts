import { loadConfig, type Config } from '@luzzle/web.config'

/** Complete resolved configuration for server tests, without reading deployment YAML. */
export function makeConfig(overrides: Partial<Config> = {}): Config {
	return { ...loadConfig(), auth: undefined, ai: undefined, ...overrides }
}

export const credentialsAuth = {
	secret: 'test-session-secret',
	credentials: { username: 'admin', password: 'test-password' }
} satisfies NonNullable<Config['auth']>

export const oidcAuth = {
	secret: 'test-session-secret',
	oidc: {
		name: 'Single Sign-On',
		issuer: 'https://issuer.example',
		clientId: 'test-client',
		clientSecret: 'test-client-secret'
	}
} satisfies NonNullable<Config['auth']>
