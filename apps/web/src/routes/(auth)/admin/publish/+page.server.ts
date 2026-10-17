import { config } from '$lib/server/config'
import { db, type JobProgressRow, type JobProgressLogsRow } from '$lib/server/database/index.js'
import { getOpenWorkflowBackend } from '$lib/server/workflow/index.js'
import { parsePiecesDiff, parsePublishFailures } from '$lib/server/workflow/publish.js'
import {
	getLatestWorkflowRun,
	getStepAttempts,
	type WorkflowRunRow,
	type PublishPieceFailure
} from '@luzzle/web.jobs'
import type { PiecesDiff } from '@luzzle/core'
import type { PageServerLoad } from './$types'

export type RunView = {
	jobId: string
	state: string
	errors: unknown
	phases: JobProgressRow[]
	logs: JobProgressLogsRow[]
	diff: PiecesDiff | null
	failedPieces: PublishPieceFailure[]
}

function mapState(status: string): string {
	if (status === 'running') return 'running'
	if (status === 'completed' || status === 'succeeded') return 'completed'
	if (status === 'failed') return 'failed'
	if (status === 'canceled') return 'canceled'
	if (status === 'skipped') return 'skipped'
	return 'waiting'
}

async function mapPhases(jobId: string): Promise<JobProgressRow[]> {
	const rows = await getStepAttempts(getOpenWorkflowBackend(), jobId)
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
		phases = await mapPhases(run.id)
		logs = await loadLogs(run.id)
	} catch (err) {
		console.error('Failed to load run progress in publish loader:', err)
	}

	let failedPieces: PublishPieceFailure[] = []
	if (run.workflow_name === 'Publish') {
		failedPieces = parsePublishFailures(run.output)
	}

	return {
		jobId: run.id,
		state: mapState(run.status),
		errors: run.error ? [run.error] : null,
		phases,
		logs,
		diff: parsePiecesDiff(run.output),
		failedPieces
	}
}

export const load: PageServerLoad = async () => {
	const meta = { title: `builder | ${config.content.text.title}` }

	let audit: RunView | null = null
	let publish: RunView | null = null

	try {
		const backend = getOpenWorkflowBackend()
		audit = await buildRunView(await getLatestWorkflowRun(backend, 'PublishAudit'))
		publish = await buildRunView(await getLatestWorkflowRun(backend, 'Publish'))
	} catch (err) {
		console.error('Failed to query OpenWorkflow runs in publish loader:', err)
	}

	return { meta, audit, publish }
}
