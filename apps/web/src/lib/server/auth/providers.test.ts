import { expect, test } from 'vitest'
import { credentialsAuth, oidcAuth } from '$lib/server/config.fixture'
import { buildAuthOptions, verifyCredentials } from './providers'

const origin = 'https://luzzle.example.test'
const admin = { username: 'admin', password: 'correct horse' }

test('credentials config registers only the YAML credentials plugin', () => {
	const options = buildAuthOptions(credentialsAuth, origin)
	expect(options.plugins?.map((plugin) => plugin.id)).toEqual(['luzzle-credentials'])
})

test('OIDC config registers only the generic OAuth plugin and camelCase fields', () => {
	const options = buildAuthOptions(oidcAuth, origin)
	expect(options.plugins?.map((plugin) => plugin.id)).toEqual(['generic-oauth'])
	expect(options.plugins?.[0].options?.config[0]).toMatchObject({
		providerId: 'oidc',
		clientId: oidcAuth.oidc.clientId,
		clientSecret: oidcAuth.oidc.clientSecret,
		discoveryUrl: `${oidcAuth.oidc.issuer}/.well-known/openid-configuration`
	})
})

test('the configured credentials authorize', () => {
	expect(verifyCredentials(admin, admin)).toEqual({ name: admin.username })
})

test.each([
	{ username: 'admin', password: 'wrong horse' },
	{ username: 'nobody', password: 'correct horse' },
	{ username: 'admin', password: 'x' },
	{ username: 'admin', password: 'correct horse!' }
])('incorrect credentials are rejected without throwing: %j', (submitted) => {
	expect(verifyCredentials(admin, submitted)).toBeNull()
})

test('multi-byte credentials use byte lengths rather than JavaScript string lengths', () => {
	const expected = { username: 'admin', password: 'café ☕' }
	expect(verifyCredentials(expected, expected)).toEqual({ name: expected.username })
	expect(verifyCredentials(expected, { username: 'admin', password: 'cafe x' })).toBeNull()
})

test('missing or non-string fields are rejected', () => {
	expect(verifyCredentials(admin, undefined)).toBeNull()
	expect(verifyCredentials(admin, null)).toBeNull()
	expect(verifyCredentials(admin, {})).toBeNull()
	expect(verifyCredentials(admin, { username: 1, password: 2 })).toBeNull()
	expect(verifyCredentials(admin, { username: admin.username, password: 2 })).toBeNull()
})
