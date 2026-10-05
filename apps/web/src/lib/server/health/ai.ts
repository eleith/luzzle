import { validateApiKey } from '@luzzle/core'
import type { AppConfig } from '$lib/server/config'
import type { ProbeResult } from './probes.js'

export async function validateAiKeyIfConfigured(config: AppConfig): Promise<ProbeResult> {
	const ai = config.ai
	if (!ai) {
		return { ok: false, reason: 'ai is not configured' }
	}
	if (ai.provider === 'google') return validateApiKey(ai.api_key)
	return { ok: false, reason: 'AI provider is not supported' }
}
