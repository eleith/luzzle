import { config } from '$lib/server/config'
import { db, type JobProgressRow, type JobProgressLogsRow } from '$lib/server/database/index.js'
import { getOpenWorkflowDb } from '$lib/server/workflow/index.js'
import { getLatestWorkflowRun, getStepAttempts } from '@luzzle/web.jobs'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const meta = { title: `builder | ${config.content.text.title}` }

	let jobId: string | null = null
	let state: string | null = null
	let errors: unknown = null
	let runId: string | null = null

	// Try OpenWorkflow first
	try {
		const owDb = getOpenWorkflowDb()
		const run = getLatestWorkflowRun(owDb, 'Publish')
		if (run) {
			jobId = run.id
			state = 'waiting'
			if (run.status === 'running') state = 'running'
			if (run.status === 'completed' || run.status === 'succeeded') state = 'completed'
			if (run.status === 'failed') state = 'failed'
			if (run.status === 'canceled') state = 'canceled'
			errors = run.error ? [run.error] : null
			runId = run.id
		}
	} catch (err) {
		console.error('Failed to query OpenWorkflow runs in publish loader:', err)
	}

	if (!jobId) {
		return { meta, job: null }
	}

	let phases: JobProgressRow[] = []
	if (runId) {
		try {
			const owDb = getOpenWorkflowDb()
			const rows = getStepAttempts(owDb, runId)
			phases = rows.map((r) => {
				let status = 'waiting'
				if (r.status === 'running') status = 'running'
				if (r.status === 'completed' || r.status === 'succeeded') status = 'completed'
				if (r.status === 'failed') status = 'failed'
				if (r.status === 'canceled') status = 'canceled'
				if (r.status === 'skipped') status = 'skipped'

				return {
					job_id: jobId!,
					phase: r.phase,
					status,
					started_at: r.started_at ? Date.parse(r.started_at) : Date.now(),
					finished_at: r.finished_at ? Date.parse(r.finished_at) : null,
					message: r.message
				}
			})
		} catch (err) {
			console.error('Failed to query OpenWorkflow steps in publish loader:', err)
		}
	}

	const logs = (await db
		.selectFrom('job_progress_logs')
		.selectAll()
		.where('job_id', '=', jobId)
		.orderBy('line_number', 'asc')
		.execute()) as JobProgressLogsRow[]

	return {
		meta,
		job: { jobId, state, errors, phases, logs }
	}
}
