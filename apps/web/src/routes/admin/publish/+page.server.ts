import { config } from '$lib/server/config'
import { db, type JobProgressRow, type JobProgressLogsRow } from '$lib/server/database/index.js'
import { Sidequest } from 'sidequest'
import { getOpenWorkflowDb } from '$lib/server/database/openworkflow.js'
import { getLatestWorkflowRun, getStepAttempts } from '@luzzle/web.jobs/openworkflow'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const meta = { title: `builder | ${config.content.text.title}` }

	let jobId: number | null = null
	let state: string | null = null
	let errors: unknown = null
	let isOpenWorkflow = false
	let runId: string | null = null

	// Try OpenWorkflow first
	try {
		const owDb = getOpenWorkflowDb()
		const run = getLatestWorkflowRun(owDb, 'Publish')
		if (run) {
			const inputData = JSON.parse(run.input)
			if (inputData && typeof inputData.jobId === 'number') {
				jobId = inputData.jobId
				state = 'waiting'
				if (run.status === 'running') state = 'running'
				if (run.status === 'completed' || run.status === 'succeeded') state = 'completed'
				if (run.status === 'failed') state = 'failed'
				if (run.status === 'canceled') state = 'canceled'
				errors = run.error ? [run.error] : null
				runId = run.id
				isOpenWorkflow = true
			}
		}
	} catch (err) {
		console.error('Failed to query OpenWorkflow runs in publish loader:', err)
	}

	// Fallback to Sidequest
	if (!jobId) {
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
	}

	if (!jobId) {
		return { meta, job: null }
	}

	let phases: JobProgressRow[] = []
	if (isOpenWorkflow && runId) {
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
	} else {
		phases = (await db
			.selectFrom('job_progress')
			.selectAll()
			.where('job_id', '=', jobId)
			.orderBy('started_at', 'asc')
			.execute()) as JobProgressRow[]
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
