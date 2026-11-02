import { loadConfig, type Config, type ConfigPublic } from '@luzzle/web.config'
import { siteImageUrls } from './site-images.js'

/** Complete resolved configuration for server tests, without reading deployment YAML. */
export function makeConfig(overrides: Partial<Config> = {}): Config {
	return { ...loadConfig(), auth: undefined, ai: undefined, ...overrides }
}

/** Public layout data for component tests; never copy private image selections. */
export function makePublicConfig(overrides: Partial<ConfigPublic> = {}): ConfigPublic {
	const config = makeConfig()
	const url = overrides.url ?? config.url
	return {
		content: {
			text: config.content.text,
			images: siteImageUrls({ ...config, url }, new URL('http://localhost'))
		},
		url: {
			app: url.app,
			app_assets: url.app_assets,
			luzzle_assets: url.luzzle_assets
		},
		...overrides
	}
}

export const credentialsAuth = {
	secret: 'test-session-secret-with-at-least-32-characters',
	credentials: { username: 'admin', password: 'test-password' }
} satisfies NonNullable<Config['auth']>

export const oidcAuth = {
	secret: 'test-session-secret-with-at-least-32-characters',
	oidc: {
		name: 'Single Sign-On',
		issuer: 'https://issuer.example',
		clientId: 'test-client',
		clientSecret: 'test-client-secret'
	}
} satisfies NonNullable<Config['auth']>
