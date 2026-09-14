import { access, constants } from 'node:fs/promises'

export type ProbeResult = { ok: true } | { ok: false; reason: string }

export async function probeStorage(root: string): Promise<ProbeResult> {
	try {
		await access(root, constants.W_OK)
		return { ok: true }
	} catch (err) {
		return { ok: false, reason: err instanceof Error ? err.message : String(err) }
	}
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<ProbeResult> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, { signal: controller.signal })
		if (!response.ok) {
			return { ok: false, reason: `responded with ${response.status}` }
		}
		return { ok: true }
	} catch (err) {
		if (err instanceof Error && err.name === 'AbortError') {
			return { ok: false, reason: `timed out after ${timeoutMs}ms` }
		}
		return { ok: false, reason: err instanceof Error ? err.message : String(err) }
	} finally {
		clearTimeout(timeout)
	}
}

function joinUrl(base: string, path: string): string {
	return `${base.replace(/\/+$/, '')}${path}`
}

export function probeWorker(url: string, timeoutMs: number): Promise<ProbeResult> {
	return fetchWithTimeout(joinUrl(url, '/health'), timeoutMs)
}

export function probeOidcIssuer(issuer: string, timeoutMs: number): Promise<ProbeResult> {
	return fetchWithTimeout(joinUrl(issuer, '/.well-known/openid-configuration'), timeoutMs)
}
