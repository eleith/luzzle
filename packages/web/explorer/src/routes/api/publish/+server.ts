import { config } from '$lib/server/config'
import type { RequestHandler } from './$types'
import { triggerBuilder } from '@luzzle/web.utils/server'
import { createChunkedStreamResponse } from '$lib/server/stream'

export const POST: RequestHandler = async () => {
	if (!config.builder?.url) {
		return new Response('Builder not configured', { status: 503 })
	}

	const action = 'publish'

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

		return createChunkedStreamResponse(response)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
