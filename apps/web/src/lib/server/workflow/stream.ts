import { db, type JobProgressRow } from '$lib/server/database/index.js'
import { createEventStream } from '../sse.js'
import { WORKFLOW_POLL_INTERVAL_MS } from '../constants.js'
import { getOpenWorkflowBackend } from './index.js'
import { getWorkflowRun, getStepAttempts } from '@luzzle/web.jobs'

const TERMINAL_STATES = new Set(['completed', 'failed', 'canceled'])

type Cursors = Record<string, number>

export type StreamJobProgressArgs = {
	jobId: string
	jobClass: string | string[]
	request: Request
	url: URL
}

function parseCursors(raw: string | null): Cursors {
	if (!raw) return {}
	try {
		const parsed = JSON.parse(raw)
		return typeof parsed === 'object' && parsed !== null ? (parsed as Cursors) : {}
	} catch {
		return {}
	}
}

function waitForNextPoll(signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		// The observer may have closed while the previous database read was pending.
		if (signal.aborted) return resolve()
		const finish = () => {
			clearTimeout(timer)
			signal.removeEventListener('abort', finish)
			resolve()
		}
		const timer = setTimeout(finish, WORKFLOW_POLL_INTERVAL_MS)
		signal.addEventListener('abort', finish, { once: true })
	})
}

function fetchNewLogs(jobId: string, phase: string, afterLine: number) {
	return db
		.selectFrom('job_progress_logs')
		.selectAll()
		.where('job_id', '=', jobId)
		.where('phase', '=', phase)
		.where('line_number', '>', afterLine)
		.orderBy('line_number', 'asc')
		.execute()
}

type Emit = (event: string, data: unknown, id?: string) => void

async function pollOnce(
	jobId: string,
	jobClass: string | string[],
	cursors: Cursors,
	emit: Emit,
	signal: AbortSignal
): Promise<boolean> {
	try {
		let job: { class: string; state: string; result: unknown; errors: unknown } | null = null
		let runId: string | null = null

		// Query OpenWorkflow
		try {
			const run = await getWorkflowRun(getOpenWorkflowBackend(), jobId)
			if (signal.aborted) return true
			if (run) {
				let state = 'waiting'
				if (run.status === 'running') state = 'running'
				if (run.status === 'completed' || run.status === 'succeeded') state = 'completed'
				if (run.status === 'failed') state = 'failed'
				if (run.status === 'canceled') state = 'canceled'

				job = {
					class: run.workflow_name,
					state,
					result: state === 'completed' ? 'ok' : null,
					errors: run.error ? [run.error] : null
				}
				runId = run.id
			}
		} catch (err) {
			console.error('Failed to query OpenWorkflow runs in SSE:', err)
		}

		if (!job) {
			emit('error', { message: 'Job not found' })
			return true
		}

		const allowedClasses = Array.isArray(jobClass) ? jobClass : [jobClass]
		if (!allowedClasses.includes(job.class)) {
			emit('error', { message: `Job is not a ${allowedClasses.join('/')} job` })
			return true
		}

		emit('state', { state: job.state, result: job.result, errors: job.errors })

		let phases: JobProgressRow[] = []
		if (runId) {
			if (signal.aborted) return true
			try {
				const rows = await getStepAttempts(getOpenWorkflowBackend(), runId)
				if (signal.aborted) return true
				phases = rows.map((r) => {
					let status = 'waiting'
					if (r.status === 'running') status = 'running'
					if (r.status === 'completed' || r.status === 'succeeded') status = 'completed'
					if (r.status === 'failed') status = 'failed'
					if (r.status === 'canceled') status = 'canceled'
					if (r.status === 'skipped') status = 'skipped'

					return {
						job_id: jobId,
						phase: r.phase,
						status,
						started_at: r.started_at ? Date.parse(r.started_at) : Date.now(),
						finished_at: r.finished_at ? Date.parse(r.finished_at) : null,
						message: r.message
					}
				})
			} catch (err) {
				console.error('Failed to query OpenWorkflow steps in SSE:', err)
			}
		}

		emit('phase', phases)

		let hasNewLogs = false
		for (const phase of phases) {
			if (signal.aborted) return true
			const newLogs = await fetchNewLogs(jobId, phase.phase, cursors[phase.phase] ?? 0)
			if (signal.aborted) return true
			if (newLogs.length > 0) {
				hasNewLogs = true
				emit('log', newLogs)
				cursors[phase.phase] = newLogs[newLogs.length - 1].line_number
			}
		}
		if (hasNewLogs) {
			emit('cursor', cursors, JSON.stringify(cursors))
		}

		if (TERMINAL_STATES.has(job.state)) {
			emit('done', { state: job.state, result: job.result, errors: job.errors })
			return true
		}
		return false
	} catch (err) {
		console.error('SSE poll error:', err)
		emit('error', { message: 'Internal poll error' })
		return false
	}
}

export function streamJobProgress({
	jobId,
	jobClass,
	request,
	url
}: StreamJobProgressArgs): Response {
	const cursors = parseCursors(
		request.headers.get('last-event-id') ?? url.searchParams.get('cursor')
	)

	const events = createEventStream(request)

	async function poll() {
		try {
			while (!events.signal.aborted) {
				if (await pollOnce(jobId, jobClass, cursors, events.emit, events.signal)) break
				await waitForNextPoll(events.signal)
			}
		} catch (error) {
			console.error('SSE stream error:', error)
			events.emit('error', { message: 'Internal stream error' })
		} finally {
			events.close()
		}
	}

	// Only polling ends when the observer disconnects; the worker job is independent.
	void poll()
	return events.response
}
