import { describe, expect, test } from 'vitest'
import { makeConfig as baseConfig } from './config.fixture'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import { buildHealthConfigSummary } from './health.js'

const makeConfig = (overrides: Partial<TemplateConfig> = {}): TemplateConfig => ({
	...baseConfig(),
	...overrides
})

describe('buildHealthConfigSummary', () => {
	test('reports the storage root', () => {
		const config = makeConfig({ storage: { root: '/data/archive' } })

		expect(buildHealthConfigSummary(config).storageRoot).toBe('/data/archive')
	})

	test('summarizes piece types by their configured fields and selected template IDs', () => {
		const config = makeConfig({
			pieces: [
				{
					type: 'article',
					fields: { title: 'title', date_consumed: 'read_date', media: ['images', 'cover'] },
					templates: {
						icon: { name: 'default', mapping: { image: { field: 'cover' } } },
						page: { name: 'default', mapping: {} },
						opengraph: { name: 'default', mapping: {} }
					}
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
				templates: [
					{ name: 'icon', value: 'default' },
					{ name: 'page', value: 'default' },
					{ name: 'opengraph', value: 'default' }
				]
			},
			{
				type: 'bookmark',
				fields: [
					{ name: 'title', value: 'title' },
					{ name: 'date_consumed', value: 'date' }
				],
				templates: [
					{ name: 'icon', value: 'default' },
					{ name: 'page', value: 'default' },
					{ name: 'opengraph', value: 'default' }
				]
			}
		])
	})

	test('reports oidc auth details without the client secret', () => {
		const config = makeConfig({
			auth: {
				secret: 'shh',
				oidc: { name: 'okta', issuer: 'https://issuer.example', clientId: 'abc', clientSecret: 'x' }
			}
		})

		const summary = buildHealthConfigSummary(config)

		expect(summary.auth).toEqual({
			enabled: true,
			type: 'oidc',
			issuer: 'https://issuer.example',
			clientId: 'abc'
		})
	})

	test('reports credentials auth details without the password', () => {
		const config = makeConfig({
			auth: {
				secret: 'shh',
				credentials: { username: 'admin', password: 'x' }
			}
		})

		const summary = buildHealthConfigSummary(config)

		expect(summary.auth).toEqual({
			enabled: true,
			type: 'credentials',
			issuer: null,
			clientId: null
		})
	})

	test('absent auth reports admin disabled with no provider', () => {
		expect(buildHealthConfigSummary(makeConfig()).auth).toEqual({
			enabled: false,
			type: null,
			issuer: null,
			clientId: null
		})
	})

	test('reports archive and cdn sync details', () => {
		const config = makeConfig({
			sync: {
				...makeConfig().sync,
				archive: { remote: 'r2', path: 'archive', flags: [] },
				cdn: { remote: 'cf', path: 'assets', strategy: 'copy', flags: [] }
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

	test('reports default empty sync targets as unconfigured', () => {
		const config = makeConfig()

		const summary = buildHealthConfigSummary(config)

		expect(summary.archiveSync).toEqual({ configured: false, remote: '', path: '' })
		expect(summary.cdnSync).toEqual({ configured: false, remote: '', path: '', strategy: 'sync' })
	})

	test('reports the worker address and queue path when configured', () => {
		const config = makeConfig({
			network: {
				...makeConfig().network,
				internal: { ...makeConfig().network.internal, worker: 'http://worker:9000' }
			},
			worker: { queue: { path: './data/queue.sqlite' } }
		})

		expect(buildHealthConfigSummary(config).worker).toEqual({
			address: 'http://worker:9000',
			queuePath: './data/queue.sqlite'
		})
	})

	test('reports the resolved worker defaults', () => {
		const config = makeConfig()

		expect(buildHealthConfigSummary(config).worker).toEqual({
			address: config.network.internal.worker,
			queuePath: config.worker.queue.path
		})
	})

	test('reports ai provider only when ai is configured', () => {
		const configured = makeConfig({ ai: { provider: 'google', api_key: 'key' } })
		const unconfigured = makeConfig({ ai: undefined })

		expect(buildHealthConfigSummary(configured).ai).toEqual({
			configured: true,
			provider: 'google'
		})
		expect(buildHealthConfigSummary(unconfigured).ai).toEqual({ configured: false, provider: null })
	})
})
