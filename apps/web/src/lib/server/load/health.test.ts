import { describe, test, expect, vi, beforeEach } from 'vitest'
import { config } from '$lib/server/config'
import { buildHealthConfigSummary } from '../health.js'
import { probeStorage, probeWorker, probeOidcIssuer } from '../health/probes.js'
import { loadHealthPage, probeWorkerIfConfigured, probeOidcIssuerIfConfigured } from './health.js'
import type { AppConfig } from '$lib/server/config'

vi.mock('$lib/server/config', () => ({
	config: {
		content: { text: { title: 'luzzle' } },
		storage: { root: '/data' },
		network: { internal: { worker: 'http://worker:9000' } },
		auth: {
			enabled: true,
			secret: 'shh',
			type: 'oidc',
			oidc: { name: 'okta', issuer: 'https://issuer.example', clientId: 'x', clientSecret: 'y' }
		}
	}
}))

vi.mock('../health.js', () => ({
	buildHealthConfigSummary: vi.fn()
}))

vi.mock('../health/probes.js', () => ({
	probeStorage: vi.fn(),
	probeWorker: vi.fn(),
	probeOidcIssuer: vi.fn()
}))

const mocks = {
	buildHealthConfigSummary: vi.mocked(buildHealthConfigSummary),
	probeStorage: vi.mocked(probeStorage),
	probeWorker: vi.mocked(probeWorker),
	probeOidcIssuer: vi.mocked(probeOidcIssuer)
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.buildHealthConfigSummary.mockReturnValue({} as never)
	mocks.probeStorage.mockResolvedValue({ ok: true })
	mocks.probeWorker.mockResolvedValue({ ok: true })
	mocks.probeOidcIssuer.mockResolvedValue({ ok: true })
	config.network = { internal: { worker: 'http://worker:9000' } }
	config.auth = {
		enabled: true,
		secret: 'shh',
		type: 'oidc',
		oidc: { name: 'okta', issuer: 'https://issuer.example', clientId: 'x', clientSecret: 'y' }
	}
})

describe('loadHealthPage', () => {
	test('awaits the storage probe but streams the worker and oidc issuer probes', async () => {
		const result = await loadHealthPage()

		expect(result.meta).toEqual({ title: 'health | luzzle' })
		expect(result.storage).toEqual({ ok: true })
		expect(mocks.probeStorage).toHaveBeenCalledWith('/data')
		expect(mocks.probeWorker).toHaveBeenCalledWith('http://worker:9000', 5000)
		expect(mocks.probeOidcIssuer).toHaveBeenCalledWith('https://issuer.example', 5000)
		await expect(result.worker).resolves.toEqual({ ok: true })
		await expect(result.oidcIssuer).resolves.toEqual({ ok: true })
	})

	test('skips the worker probe when no worker address is configured', async () => {
		config.network = undefined

		const result = await loadHealthPage()

		expect(mocks.probeWorker).not.toHaveBeenCalled()
		await expect(result.worker).resolves.toEqual({
			ok: false,
			reason: 'worker address not configured'
		})
	})

	test('skips the oidc issuer probe when auth is not oidc', async () => {
		config.auth = {
			enabled: true,
			secret: 'shh',
			type: 'credentials',
			credentials: { username: 'admin', password: 'x' }
		}

		const result = await loadHealthPage()

		expect(mocks.probeOidcIssuer).not.toHaveBeenCalled()
		await expect(result.oidcIssuer).resolves.toBeNull()
	})
})

describe('probeWorkerIfConfigured', () => {
	test('probes the configured worker address', async () => {
		const appConfig = { network: { internal: { worker: 'http://worker:9000' } } } as AppConfig

		await expect(probeWorkerIfConfigured(appConfig)).resolves.toEqual({ ok: true })
		expect(mocks.probeWorker).toHaveBeenCalledWith('http://worker:9000', 5000)
	})

	test('resolves not-ok without probing when no worker address is configured', async () => {
		const appConfig = { network: undefined } as AppConfig

		await expect(probeWorkerIfConfigured(appConfig)).resolves.toEqual({
			ok: false,
			reason: 'worker address not configured'
		})
		expect(mocks.probeWorker).not.toHaveBeenCalled()
	})
})

describe('probeOidcIssuerIfConfigured', () => {
	test('probes the issuer when auth type is oidc', async () => {
		const appConfig = {
			auth: {
				enabled: true,
				secret: 'shh',
				type: 'oidc',
				oidc: { issuer: 'https://issuer.example' }
			}
		} as AppConfig

		await expect(probeOidcIssuerIfConfigured(appConfig)).resolves.toEqual({ ok: true })
		expect(mocks.probeOidcIssuer).toHaveBeenCalledWith('https://issuer.example', 5000)
	})

	test('resolves null without probing when auth is not oidc', async () => {
		const appConfig = {
			auth: { enabled: true, secret: 'shh', type: 'credentials' }
		} as AppConfig

		await expect(probeOidcIssuerIfConfigured(appConfig)).resolves.toBeNull()
		expect(mocks.probeOidcIssuer).not.toHaveBeenCalled()
	})
})
