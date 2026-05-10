import { config } from '$lib/server/config'
import type { RequestHandler } from './$types'
import { triggerBuilder } from '@luzzle/web.utils/server'

export const POST: RequestHandler = async ({ url }) => {
	if (!config.builder?.url) {
		return new Response('Builder not configured', { status: 503 })
	}

	const actionParam = url.searchParams.get('action')
	const action = actionParam === 'sync' ? 'sync' : 'build'

	try {
		const response = await triggerBuilder(config.builder, action)

		if (!response.body) {
			return new Response('No response body from builder', { status: 502 })
		}

		if (!response.ok) {
			const text = await response.text()
			return new Response(`Builder error: ${response.status} ${response.statusText}\n${text}`, {
				status: response.status
			})
		}

		return new Response(response.body, {
			headers: {
				'Content-Type': 'text/plain',
				'Transfer-Encoding': 'chunked',
				'X-Accel-Buffering': 'no'
			}
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
