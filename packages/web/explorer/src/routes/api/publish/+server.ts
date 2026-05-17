import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { Publish } from '$lib/server/sidequest.jobs.js'
import { Sidequest } from 'sidequest'

export const POST: RequestHandler = async () => {
	try {
		const inFlight = await Sidequest.job.list({
			jobClass: 'Publish',
			state: ['waiting', 'claimed', 'running']
		})
		if (inFlight.length > 0) {
			return json({ jobId: inFlight[0].id }, { status: 409 })
		}

		const job = await Sidequest.build(Publish).maxAttempts(1).enqueue()
		return json({ jobId: job.id })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
