import { db, type JobProgressRow } from '$lib/server/database/index.js'
import { getOpenWorkflowDb } from './index.js'
import { getWorkflowRun, getStepAttempts } from '@luzzle/web.jobs'

const POLL_INTERVAL_MS = 350
const TERMINAL_STATES = new Set(['completed', 'failed', 'canceled'])

type Cursors = Record<string, number>

export type StreamJobProgressArgs = {
	jobId: string
	jobClass: string
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

function encodeEvent(event: string, data: unknown, id?: string): string {
	const lines = [`event: ${event}`]
	if (id) lines.push(`id: ${id}`)
	lines.push(`data: ${JSON.stringify(data)}`)
	return lines.join('\n') + '\n\n'
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, ms)
		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(timer)
				resolve()
			},
			{ once: true }
		)
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
	jobClass: string,
	cursors: Cursors,
	emit: Emit
): Promise<boolean> {
	try {
		let job: { class: string; state: string; result: unknown; errors: unknown } | null = null
		let runId: string | null = null

		// Query OpenWorkflow
		try {
			const openWorkflowDb = getOpenWorkflowDb()
			const run = getWorkflowRun(openWorkflowDb, jobId)
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

		if (job.class !== jobClass) {
			emit('error', { message: `Job is not a ${jobClass} job` })
			return true
		}

		emit('state', { state: job.state, result: job.result, errors: job.errors })

		let phases: JobProgressRow[] = []
		if (runId) {
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
			const newLogs = await fetchNewLogs(jobId, phase.phase, cursors[phase.phase] ?? 0)
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

	const stream = new ReadableStream<string>({
		async start(controller) {
			const { signal } = request
			let closed = false

			const close = () => {
				if (closed) return
				closed = true
				try {
					controller.close()
				} catch {
					// already closed
				}
			}

			const emit: Emit = (event, data, id) => {
				if (closed) return
				try {
					controller.enqueue(encodeEvent(event, data, id))
				} catch {
					close()
				}
			}

			signal.addEventListener('abort', close, { once: true })

			while (!closed && !signal.aborted) {
				const terminal = await pollOnce(jobId, jobClass, cursors, emit)
				if (terminal) {
					close()
					return
				}
				await sleep(POLL_INTERVAL_MS, signal)
			}
		}
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	})
}
