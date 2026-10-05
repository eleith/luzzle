import { describe, test, expect, vi, beforeEach } from 'vitest'
import { config } from '$lib/server/config'
import { makeConfig, credentialsAuth, oidcAuth } from '../config.fixture'
import { buildHealthConfigSummary } from '../health.js'
import type * as Health from '../health.js'
import { probeStorage, probeWorker, probeOidcIssuer } from '../health/probes.js'
import { loadHealthPage, probeWorkerIfConfigured, probeOidcIssuerIfConfigured } from './health.js'

vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('../config.fixture')
	return { config: makeConfig() }
})

vi.mock('../health.js', () => ({ buildHealthConfigSummary: vi.fn() }))
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

beforeEach(async () => {
	vi.clearAllMocks()
	const { buildHealthConfigSummary: summarize } =
		await vi.importActual<typeof Health>('../health.js')
	mocks.buildHealthConfigSummary.mockReturnValue(summarize(makeConfig()))
	mocks.probeStorage.mockResolvedValue({ ok: true })
	mocks.probeWorker.mockResolvedValue({ ok: true })
	mocks.probeOidcIssuer.mockResolvedValue({ ok: true })
	Object.assign(config, makeConfig())
	config.content.text.title = 'luzzle'
	config.storage.root = '/data'
	config.network.internal.worker = 'http://worker:9000'
	config.auth = oidcAuth
})

describe('loadHealthPage', () => {
	test('awaits storage but streams worker and oidc issuer probes', async () => {
		const result = await loadHealthPage()
		expect(result.meta).toEqual({ title: 'health | luzzle' })
		expect(result.storage).toEqual({ ok: true })
		expect(mocks.probeStorage).toHaveBeenCalledWith('/data')
		expect(mocks.probeWorker).toHaveBeenCalledWith('http://worker:9000', 5000)
		expect(mocks.probeOidcIssuer).toHaveBeenCalledWith('https://issuer.example', 5000)
		await expect(result.worker).resolves.toEqual({ ok: true })
		await expect(result.oidcIssuer).resolves.toEqual({ ok: true })
	})

	test('skips the worker probe when its address is empty', async () => {
		config.network.internal.worker = ''
		const result = await loadHealthPage()
		expect(mocks.probeWorker).not.toHaveBeenCalled()
		await expect(result.worker).resolves.toEqual({
			ok: false,
			reason: 'worker address not configured'
		})
	})

	test.each([undefined, credentialsAuth])(
		'skips oidc when absent or credentials auth is selected',
		async (auth) => {
			config.auth = auth
			const result = await loadHealthPage()
			expect(mocks.probeOidcIssuer).not.toHaveBeenCalled()
			await expect(result.oidcIssuer).resolves.toBeNull()
		}
	)
})

describe('probeWorkerIfConfigured', () => {
	test('probes the configured worker address', async () => {
		await expect(probeWorkerIfConfigured(config)).resolves.toEqual({ ok: true })
		expect(mocks.probeWorker).toHaveBeenCalledWith('http://worker:9000', 5000)
	})

	test('resolves not-ok without probing an empty worker address', async () => {
		config.network.internal.worker = ''
		await expect(probeWorkerIfConfigured(config)).resolves.toEqual({
			ok: false,
			reason: 'worker address not configured'
		})
		expect(mocks.probeWorker).not.toHaveBeenCalled()
	})
})

describe('probeOidcIssuerIfConfigured', () => {
	test('probes the selected oidc issuer', async () => {
		await expect(probeOidcIssuerIfConfigured(makeConfig({ auth: oidcAuth }))).resolves.toEqual({
			ok: true
		})
		expect(mocks.probeOidcIssuer).toHaveBeenCalledWith('https://issuer.example', 5000)
	})

	test.each([undefined, credentialsAuth])(
		'resolves null for absent or credentials auth',
		async (auth) => {
			await expect(probeOidcIssuerIfConfigured(makeConfig({ auth }))).resolves.toBeNull()
			expect(mocks.probeOidcIssuer).not.toHaveBeenCalled()
		}
	)
})
