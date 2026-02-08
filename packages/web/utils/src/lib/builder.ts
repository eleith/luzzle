import { type Schema } from './config/schema.js'

export async function triggerBuilder(
	config: Schema['builder'],
	action: 'build' | 'deploy'
): Promise<Response> {
	if (!config?.url) {
		throw new Error('Builder URL not configured')
	}

	const urlObj = new URL(config.url)
	if (!urlObj.searchParams.has('action')) {
		urlObj.searchParams.set('action', action)
	}

	return fetch(urlObj, {
		method: config.method || 'POST',
		headers: (config.headers as HeadersInit) || {},
		body: config.body || null
	})
}
