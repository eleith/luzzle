import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { Preview } from '$lib/server/sidequest.jobs.js'
import { Sidequest } from 'sidequest'

export const POST: RequestHandler = async ({ request }) => {
	let payload: { filePath?: unknown }
	try {
		payload = await request.json()
	} catch {
		throw error(400, 'invalid JSON body')
	}

	const filePath = payload.filePath
	if (typeof filePath !== 'string' || !filePath) {
		throw error(400, 'filePath is required')
	}

	try {
		const job = await Sidequest.build(Preview).maxAttempts(1).enqueue({ filePath })
		return json({ jobId: job.id })
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e)
		return new Response(`Internal server error: ${message}`, { status: 500 })
	}
}
