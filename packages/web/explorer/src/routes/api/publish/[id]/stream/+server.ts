/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type { RequestHandler } from './$types'
import { db } from '$lib/server/database/index.js'
import { Sidequest } from 'sidequest'
import { configureQueue } from '$lib/server/queue.js'

export const GET: RequestHandler = async ({ params, request, url }) => {
	const jobId = parseInt(params.id, 10)
	if (isNaN(jobId)) {
		return new Response('Invalid job ID', { status: 400 })
	}

	await configureQueue()

	let cursors: Record<string, number> = {}
	const lastEventId = request.headers.get('last-event-id') || url.searchParams.get('cursor')
	if (lastEventId) {
		try {
			cursors = JSON.parse(lastEventId)
		} catch (e) {
			// ignore invalid cursor
		}
	}

	const stream = new ReadableStream({
		async start(controller) {
			let isClosed = false
			let pollTimer: NodeJS.Timeout

			const closeStream = () => {
				if (isClosed) return
				isClosed = true
				clearTimeout(pollTimer)
				try {
					controller.close()
				} catch (e) {
					// Controller might already be closed
				}
			}

			// Clean up if browser disconnects
			request.signal.addEventListener('abort', closeStream)

			const sendEvent = (event: string, data: any, id?: string) => {
				if (isClosed) return
				let msg = `event: ${event}\n`
				if (id) msg += `id: ${id}\n`
				msg += `data: ${JSON.stringify(data)}\n\n`
				try {
					controller.enqueue(msg)
				} catch (e) {
					closeStream()
				}
			}

			const poll = async () => {
				if (isClosed) return

				try {
					// 1. Check Sidequest job state
					const job = await Sidequest.job.get(jobId)
					if (!job) {
						sendEvent('error', { message: 'Job not found' })
						closeStream()
						return
					}

					// Verify it's a Publish job (defensive check)
					if (job.class !== 'Publish') {
						sendEvent('error', { message: 'Job is not a Publish job' })
						closeStream()
						return
					}

					sendEvent('state', { state: job.state, result: job.result, errors: job.errors })

					// 2. Fetch phase states (full snapshot)
					const phases = await db
						.selectFrom('job_progress' as any)
						.selectAll()
						.where('job_id', '=', jobId)
						.orderBy('started_at', 'asc')
						.execute()

					sendEvent('phase', phases)

					// 3. Fetch new log lines
					let hasNewLogs = false
					for (const phase of phases) {
						const lastLine = cursors[phase.phase] || 0
						const newLogs = await db
							.selectFrom('job_progress_logs' as any)
							.selectAll()
							.where('job_id', '=', jobId)
							.where('phase', '=', phase.phase)
							.where('line_number', '>', lastLine)
							.orderBy('line_number', 'asc')
							.execute()

						if (newLogs.length > 0) {
							hasNewLogs = true
							sendEvent('log', newLogs)
							cursors[phase.phase] = newLogs[newLogs.length - 1].line_number
						}
					}

					// Send the latest cursor back to the client as an id
					if (hasNewLogs) {
						// we send an empty event just to update the Last-Event-ID if needed,
						// or we can attach the ID to the log event itself. We did it in log above? No.
						// Actually, let's just send a heartbeat or cursor update
						sendEvent('cursor', cursors, JSON.stringify(cursors))
					}

					// 4. Check if job is terminal AND no more logs are coming
					const isTerminal = ['completed', 'failed', 'canceled'].includes(job.state)
					// If terminal, we assume no more logs. But we already fetched logs *after* checking state,
					// so we've drained everything up to the terminal state check.
					if (isTerminal) {
						sendEvent('done', { state: job.state, result: job.result, errors: job.errors })
						closeStream()
						return
					}
				} catch (err) {
					console.error('SSE poll error:', err)
					sendEvent('error', { message: 'Internal poll error' })
				}

				if (!isClosed) {
					pollTimer = setTimeout(poll, 350)
				}
			}

			// Initial poll
			poll()
		},
		cancel() {
			// This is called when stream is canceled by the consumer
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
