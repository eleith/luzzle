import type { AppConfig } from '$lib/server/config'
import { config } from '$lib/server/config'
import { buildHealthConfigSummary, type HealthConfigSummary } from '../health.js'
import { probeStorage, probeWorker, probeOidcIssuer, type ProbeResult } from '../health/probes.js'

const PROBE_TIMEOUT_MS = 5000

export interface HealthView {
	meta: { title: string }
	configSummary: HealthConfigSummary
	storage: ProbeResult
	worker: Promise<ProbeResult>
	oidcIssuer: Promise<ProbeResult | null>
}

export function probeWorkerIfConfigured(appConfig: AppConfig): Promise<ProbeResult> {
	const address = appConfig.network?.internal?.worker
	return address
		? probeWorker(address, PROBE_TIMEOUT_MS)
		: Promise.resolve({ ok: false, reason: 'worker address not configured' })
}

export function probeOidcIssuerIfConfigured(appConfig: AppConfig): Promise<ProbeResult | null> {
	const issuer = appConfig.auth.type === 'oidc' ? appConfig.auth.oidc?.issuer : undefined
	return issuer ? probeOidcIssuer(issuer, PROBE_TIMEOUT_MS) : Promise.resolve(null)
}

export async function loadHealthPage(): Promise<HealthView> {
	const meta = { title: `health | ${config.content.text.title}` }
	const configSummary = buildHealthConfigSummary(config)

	const storage = await probeStorage(config.storage.root)
	const worker = probeWorkerIfConfigured(config)
	const oidcIssuer = probeOidcIssuerIfConfigured(config)

	return {
		meta,
		configSummary,
		storage,
		worker,
		oidcIssuer
	}
}
