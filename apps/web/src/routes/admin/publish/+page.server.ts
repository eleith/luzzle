import { config } from '$lib/server/config'
import { db, type JobProgressRow, type JobProgressLogsRow } from '$lib/server/database/index.js'
import { getOpenWorkflowDb } from '$lib/server/workflow/index.js'
import { parsePiecesDiff } from '$lib/server/workflow/pieces-diff.js'
import { getLatestWorkflowRun, getStepAttempts, type WorkflowRunRow } from '@luzzle/web.jobs'
import type { PiecesDiff } from '@luzzle/core'
import type { PageServerLoad } from './$types'

export type RunView = {
	jobId: string
	state: string
	errors: unknown
	phases: JobProgressRow[]
	logs: JobProgressLogsRow[]
	diff: PiecesDiff | null
}

function mapState(status: string): string {
	if (status === 'running') return 'running'
	if (status === 'completed' || status === 'succeeded') return 'completed'
	if (status === 'failed') return 'failed'
	if (status === 'canceled') return 'canceled'
	if (status === 'skipped') return 'skipped'
	return 'waiting'
}

function mapPhases(jobId: string): JobProgressRow[] {
	const rows = getStepAttempts(getOpenWorkflowDb(), jobId)
	return rows.map((r) => ({
		job_id: jobId,
		phase: r.phase,
		status: mapState(r.status),
		started_at: r.started_at ? Date.parse(r.started_at) : Date.now(),
		finished_at: r.finished_at ? Date.parse(r.finished_at) : null,
		message: r.message
	})) as JobProgressRow[]
}

async function loadLogs(jobId: string): Promise<JobProgressLogsRow[]> {
	return (await db
		.selectFrom('job_progress_logs')
		.selectAll()
		.where('job_id', '=', jobId)
		.orderBy('line_number', 'asc')
		.execute()) as JobProgressLogsRow[]
}

async function buildRunView(run: WorkflowRunRow | null): Promise<RunView | null> {
	if (!run) return null

	let phases: JobProgressRow[] = []
	let logs: JobProgressLogsRow[] = []
	try {
		phases = mapPhases(run.id)
		logs = await loadLogs(run.id)
	} catch (err) {
		console.error('Failed to load run progress in publish loader:', err)
	}

	return {
		jobId: run.id,
		state: mapState(run.status),
		errors: run.error ? [run.error] : null,
		phases,
		logs,
		diff: parsePiecesDiff(run.output)
	}
}

export const load: PageServerLoad = async () => {
	const meta = { title: `builder | ${config.content.text.title}` }

	let audit: RunView | null = null
	let publish: RunView | null = null

	try {
		const openWorkflowDb = getOpenWorkflowDb()
		audit = await buildRunView(getLatestWorkflowRun(openWorkflowDb, 'PublishAudit'))
		publish = await buildRunView(getLatestWorkflowRun(openWorkflowDb, 'Publish'))
	} catch (err) {
		console.error('Failed to query OpenWorkflow runs in publish loader:', err)
	}

	return { meta, audit, publish }
}
