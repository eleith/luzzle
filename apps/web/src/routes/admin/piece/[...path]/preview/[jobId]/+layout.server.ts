import { error } from '@sveltejs/kit'
import { config } from '$lib/server/config'
import { assemblePreview, type PreviewWorkerResult } from '$lib/pieces/preview/assemble.server.js'
import { getOpenWorkflowDb } from '$lib/server/workflow/index.js'
import { getWorkflowRun, getStepAttempts } from '@luzzle/web.jobs'
import { db, type JobProgressLogsRow, type JobProgressRow } from '$lib/server/database/index.js'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ params }) => {
	const runId = params.jobId

	let run: ReturnType<typeof getWorkflowRun> | undefined

	try {
		const openWorkflowDb = getOpenWorkflowDb()
		run = getWorkflowRun(openWorkflowDb, runId)
	} catch (err) {
		console.error('Failed to query OpenWorkflow preview run:', err)
	}

	if (!run) {
		return error(404, 'Preview not found')
	}

	let state = 'waiting'
	if (run.status === 'running') state = 'running'
	if (run.status === 'completed' || run.status === 'succeeded') state = 'completed'
	if (run.status === 'failed') state = 'failed'
	if (run.status === 'canceled') state = 'canceled'

	let phases: JobProgressRow[] = []
	try {
		const openWorkflowDb = getOpenWorkflowDb()
		const rows = getStepAttempts(openWorkflowDb, runId)
		phases = rows.map((r) => {
			let status = 'waiting'
			if (r.status === 'running') status = 'running'
			if (r.status === 'completed' || r.status === 'succeeded') status = 'completed'
			if (r.status === 'failed') status = 'failed'
			if (r.status === 'canceled') status = 'canceled'
			if (r.status === 'skipped') status = 'skipped'

			return {
				job_id: runId,
				phase: r.phase,
				status,
				started_at: r.started_at ? Date.parse(r.started_at) : Date.now(),
				finished_at: r.finished_at ? Date.parse(r.finished_at) : null,
				message: r.message
			}
		})
	} catch (err) {
		console.error('Failed to query OpenWorkflow steps in preview loader:', err)
	}

	const logs = (await db
		.selectFrom('job_progress_logs')
		.selectAll()
		.where('job_id', '=', runId)
		.orderBy('line_number', 'asc')
		.execute()) as JobProgressLogsRow[]

	if (state === 'completed' && run.output) {
		const retentionMs = 2 * 24 * 60 * 60 * 1000
		const completedAt = run.finished_at ? new Date(run.finished_at) : null
		const isExpired = completedAt && Date.now() - completedAt.getTime() > retentionMs
		if (isExpired) {
			return { file: params.path, status: 'expired' as const, jobId: runId, phases, logs }
		}

		const result = JSON.parse(run.output) as PreviewWorkerResult
		const pieceConfig = config.pieces.find((p) => p.type === result.type)
		if (!pieceConfig) {
			return error(500, `Unknown piece type: ${result.type}`)
		}
		const assembled = assemblePreview(result, pieceConfig)
		return { file: params.path, status: 'completed' as const, jobId: runId, phases, logs, ...assembled }
	}

	if (state === 'failed' || state === 'canceled') {
		return {
			file: params.path,
			status: 'failed' as const,
			jobId: runId,
			phases,
			logs,
			errorMessage: run.error ?? 'Preview failed'
		}
	}

	return { file: params.path, jobId: runId, status: state as 'waiting' | 'running', phases, logs }
}

