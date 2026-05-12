export function createChunkedStreamResponse(response: Response): Response {
	if (!response.body) {
		return new Response('No response body', { status: 502 })
	}

	const stream = new ReadableStream({
		start(controller) {
			const reader = response.body?.getReader()
			if (!reader) {
				controller.close()
				return
			}

			function push() {
				reader!
					.read()
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
		status: response.status,
		headers: {
			'Content-Type': response.headers.get('Content-Type') || 'text/plain',
			'Transfer-Encoding': 'chunked',
			'X-Accel-Buffering': 'no'
		}
	})
}
