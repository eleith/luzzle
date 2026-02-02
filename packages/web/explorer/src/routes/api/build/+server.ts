import { config } from '$lib/server/config'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async () => {
	if (!config.builder?.url) {
		return new Response('Builder not configured', { status: 503 })
	}

	try {
		const headers: HeadersInit = {
			...config.builder.headers
		}

		const response = await fetch(config.builder.url, {
			method: config.builder.method || 'POST',
			headers,
			body: config.builder.body || '{}'
		})

		if (!response.body) {
			return new Response('No response body from builder', { status: 502 })
		}

		if (!response.ok) {
			const text = await response.text()
			return new Response(`Builder error: ${response.status} ${response.statusText}\n${text}`, {
				status: response.status
			})
		}

		const stream = new ReadableStream({
			start(controller) {
				const reader = response.body?.getReader()

				function push() {
					reader
						?.read()
						.then(({ done, value }) => {
							if (done) {
								controller.close()
								return
							}
							controller.enqueue(value)
							push()
						})
						.catch((error) => {
							controller.error(error)
						})
				}

				push()
			}
		})

		return new Response(stream, {
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
