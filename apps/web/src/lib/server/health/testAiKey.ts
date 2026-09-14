import { validateApiKey } from '@luzzle/core'
import type { AppConfig } from '$lib/server/config'
import type { ProbeResult } from './probes.js'

export async function validateAiKeyIfConfigured(config: AppConfig): Promise<ProbeResult> {
	const apiKey = config.ai?.api_key
	if (!apiKey) {
		return { ok: false, reason: 'ai is not configured' }
	}
	return validateApiKey(apiKey)
}
