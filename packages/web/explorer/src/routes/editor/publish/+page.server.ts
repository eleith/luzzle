import { config } from '$lib/server/config'
import { db, type JobProgressRow, type JobProgressLogsRow } from '$lib/server/database/index.js'
import { Sidequest } from 'sidequest'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const meta = { title: `builder | ${config.content.text.title}` }

	const latest = await db
		.selectFrom('job_progress')
		.select((eb) => eb.fn.max<number>('job_id').as('job_id'))
		.executeTakeFirst()

	const jobId = latest?.job_id ?? null

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

	let state: string | null = null
	let errors: unknown = null
	try {
		const job = await Sidequest.job.get(jobId)
		if (job && job.class === 'Publish') {
			state = job.state
			errors = job.errors
		}
	} catch {
		// queue unavailable — leave state null and let client decide
	}

	return {
		meta,
		job: { jobId, state, errors, phases, logs }
	}
}
