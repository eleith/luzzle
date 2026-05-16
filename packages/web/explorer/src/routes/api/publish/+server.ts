import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { enqueueJob, configureQueue } from '$lib/server/queue.js'
import { Publish } from '$lib/server/sidequest.jobs.js'
import { Sidequest } from 'sidequest'

export const POST: RequestHandler = async () => {
	try {
		await configureQueue()

		// Duplicate-publish guard
		try {
			const inFlight = await Sidequest.job.list({
				jobClass: 'Publish',
				state: ['waiting', 'claimed', 'running']
			})
			if (inFlight.length > 0) {
				return json({ jobId: inFlight[0].id }, { status: 409 })
			}
		} catch (error) {
			// Fail-closed on list error to avoid silently enqueueing duplicates
			const message = error instanceof Error ? error.message : String(error)
			return new Response(`Internal server error during duplicate check: ${message}`, {
				status: 500
			})
		}

		const job = await enqueueJob(Publish)
		return json({ jobId: job.id })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
