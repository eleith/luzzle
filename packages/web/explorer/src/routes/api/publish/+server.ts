import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { enqueueJob } from '$lib/server/queue.js'
import { Publish } from '$lib/server/sidequest.jobs.js'

export const POST: RequestHandler = async () => {
	try {
		const job = await enqueueJob(Publish)
		return json({ jobId: job.id })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
