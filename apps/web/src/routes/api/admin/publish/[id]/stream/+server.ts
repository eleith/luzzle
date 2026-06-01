import type { RequestHandler } from './$types'
import { streamJobProgress } from '$lib/server/sse-progress.js'

export const GET: RequestHandler = ({ params, request, url }) => {
	const jobId = parseInt(params.id, 10)
	if (isNaN(jobId)) {
		return new Response('Invalid job ID', { status: 400 })
	}
	return streamJobProgress({ jobId, jobClass: 'Publish', request, url })
}
