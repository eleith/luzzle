import { describe, expect, test } from 'vitest'
import type { AppConfig } from './config.js'
import { buildHealthConfigSummary } from './health.js'

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
	return {
		storage: { root: '/data/archive' },
		pieces: [],
		auth: { enabled: true, secret: 'shh', type: 'oidc' },
		sync: {},
		worker: undefined,
		ai: undefined,
		...overrides
	} as AppConfig
}

describe('buildHealthConfigSummary', () => {
	test('reports the storage root', () => {
		const config = makeConfig({ storage: { root: '/data/archive' } })

		expect(buildHealthConfigSummary(config).storageRoot).toBe('/data/archive')
	})

	test('summarizes piece types by their configured field and component values', () => {
		const config = makeConfig({
			pieces: [
				{
					type: 'article',
					fields: { title: 'title', date_consumed: 'read_date', media: ['images', 'cover'] },
					components: { icon: 'icon.svelte' }
				},
				{
					type: 'bookmark',
					fields: { title: 'title', date_consumed: 'date' }
				}
			]
		})

		const summary = buildHealthConfigSummary(config)

		expect(summary.pieceTypes).toEqual([
			{
				type: 'article',
				fields: [
					{ name: 'title', value: 'title' },
					{ name: 'date_consumed', value: 'read_date' },
					{ name: 'media', value: 'images, cover' }
				],
				components: [{ name: 'icon', value: 'icon.svelte' }]
			},
			{
				type: 'bookmark',
				fields: [
					{ name: 'title', value: 'title' },
					{ name: 'date_consumed', value: 'date' }
				],
				components: []
			}
		])
	})

	test('reports oidc auth details without the client secret', () => {
		const config = makeConfig({
			auth: {
				enabled: true,
				secret: 'shh',
				type: 'oidc',
				oidc: { name: 'okta', issuer: 'https://issuer.example', clientId: 'abc', clientSecret: 'x' }
			}
		})

		const summary = buildHealthConfigSummary(config)

		expect(summary.auth).toEqual({
			enabled: true,
			type: 'oidc',
			issuer: 'https://issuer.example',
			clientId: 'abc',
			username: null
		})
	})

	test('reports credentials auth details without the password', () => {
		const config = makeConfig({
			auth: {
				enabled: true,
				secret: 'shh',
				type: 'credentials',
				credentials: { username: 'admin', password: 'x' }
			}
		})

		const summary = buildHealthConfigSummary(config)

		expect(summary.auth).toEqual({
			enabled: true,
			type: 'credentials',
			issuer: null,
			clientId: null,
			username: 'admin'
		})
	})

	test('reports archive and cdn sync details', () => {
		const config = makeConfig({
			sync: {
				archive: { remote: 'r2', path: 'archive' },
				cdn: { remote: 'cf', path: 'assets', strategy: 'copy' }
			}
		})

		const summary = buildHealthConfigSummary(config)

		expect(summary.archiveSync).toEqual({ configured: true, remote: 'r2', path: 'archive' })
		expect(summary.cdnSync).toEqual({
			configured: true,
			remote: 'cf',
			path: 'assets',
			strategy: 'copy'
		})
	})

	test('reports unconfigured sync targets as null details', () => {
		const config = makeConfig({ sync: {} })

		const summary = buildHealthConfigSummary(config)

		expect(summary.archiveSync).toEqual({ configured: false, remote: null, path: null })
		expect(summary.cdnSync).toEqual({ configured: false, remote: null, path: null, strategy: null })
	})

	test('reports the worker address and queue path when configured', () => {
		const config = makeConfig({
			network: { internal: { worker: 'http://worker:9000' } },
			worker: { queue: { path: './data/queue.sqlite' } }
		})

		expect(buildHealthConfigSummary(config).worker).toEqual({
			address: 'http://worker:9000',
			queuePath: './data/queue.sqlite'
		})
	})

	test('reports no worker address or queue path when unconfigured', () => {
		const config = makeConfig({ network: undefined, worker: undefined })

		expect(buildHealthConfigSummary(config).worker).toEqual({ address: null, queuePath: null })
	})

	test('reports ai provider only when an api_key is present', () => {
		const configured = makeConfig({ ai: { provider: 'google', api_key: 'key' } })
		const unconfigured = makeConfig({ ai: undefined })

		expect(buildHealthConfigSummary(configured).ai).toEqual({
			configured: true,
			provider: 'google'
		})
		expect(buildHealthConfigSummary(unconfigured).ai).toEqual({ configured: false, provider: null })
	})
})
