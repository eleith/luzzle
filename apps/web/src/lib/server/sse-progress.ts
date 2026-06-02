import { db } from '$lib/server/database/index.js'
import { Sidequest } from 'sidequest'
import { getOpenWorkflowDb } from '$lib/server/database/openworkflow.js'

const POLL_INTERVAL_MS = 350
const TERMINAL_STATES = new Set(['completed', 'failed', 'canceled'])

type Cursors = Record<string, number>

export type StreamJobProgressArgs = {
	jobId: number
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

function fetchPhases(jobId: number) {
	return db
		.selectFrom('job_progress')
		.selectAll()
		.where('job_id', '=', jobId)
		.orderBy('started_at', 'asc')
		.execute()
}

function fetchNewLogs(jobId: number, phase: string, afterLine: number) {
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
	jobId: number,
	jobClass: string,
	cursors: Cursors,
	emit: Emit
): Promise<boolean> {
	try {
		let job: { class: string; state: string; result: unknown; errors: unknown } | null = null

		// Try Sidequest first
		try {
			const sqJob = await Sidequest.job.get(jobId)
			if (sqJob) {
				job = {
					class: sqJob.class,
					state: sqJob.state,
					result: sqJob.result,
					errors: sqJob.errors
				}
			}
		} catch (_err) {
			// ignore sidequest errors
		}

		// Fallback to OpenWorkflow
		if (!job) {
			try {
				const owDb = getOpenWorkflowDb()
				const stmt = owDb.prepare(`
					SELECT id, workflow_name, status, error FROM workflow_runs 
					WHERE json_extract(input, '$.jobId') = ?
					LIMIT 1
				`)
				const run = stmt.get(jobId) as
					| { id: string; workflow_name: string; status: string; error: string | null }
					| undefined
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
				}
			} catch (err) {
				console.error('Failed to query OpenWorkflow runs in SSE:', err)
			}
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

		const phases = await fetchPhases(jobId)
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
