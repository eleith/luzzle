import { config } from '$lib/server/config'
import { db, type JobProgressRow, type JobProgressLogsRow } from '$lib/server/database/index.js'
import { Sidequest } from 'sidequest'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const meta = { title: `builder | ${config.content.text.title}` }

	let jobId: number | null = null
	let state: string | null = null
	let errors: unknown = null

	try {
		const jobs = await Sidequest.job.list({ jobClass: 'Publish', limit: 1 })
		if (jobs.length > 0) {
			jobId = jobs[0].id
			state = jobs[0].state
			errors = jobs[0].errors
		}
	} catch {
		// queue unavailable
	}

	if (!jobId) {
		return { meta, job: null }
	}

	const [phases, logs] = (await Promise.all([
		db
			.selectFrom('job_progress')
			.selectAll()
			.where('job_id', '=', jobId)
			.orderBy('started_at', 'asc')
			.execute(),
		db
			.selectFrom('job_progress_logs')
			.selectAll()
			.where('job_id', '=', jobId)
			.orderBy('line_number', 'asc')
			.execute()
	])) as [JobProgressRow[], JobProgressLogsRow[]]

	return {
		meta,
		job: { jobId, state, errors, phases, logs }
	}
}
