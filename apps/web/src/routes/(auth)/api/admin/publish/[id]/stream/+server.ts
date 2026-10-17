import type { RequestHandler } from './$types'
import { streamJobProgress } from '$lib/server/workflow/stream.js'

export const GET: RequestHandler = ({ params, request, url }) => {
	const jobId = params.id
	if (!jobId) {
		return new Response('Invalid job ID', { status: 400 })
	}
	return streamJobProgress({ jobId, jobClass: ['Publish', 'PublishAudit'], request, url })
}
