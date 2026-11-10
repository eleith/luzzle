import { describe, expect, test } from 'vitest'
import { render } from 'svelte/server'
import WorkflowConsole from './WorkflowConsole.svelte'
import type { ProgressPhase, ProgressLog } from '#lib/components/progress.js'

const started = Date.parse('2026-01-02T03:04:00Z')
const phases: ProgressPhase[] = [
	{
		phase: 'render',
		status: 'completed',
		started_at: started,
		finished_at: started + 65_000,
		message: 'Rendered successfully'
	}
]
const logs: Record<string, ProgressLog[]> = {
	render: [
		{ phase: 'render', line_number: 1, ts: started, level: 'stdout', message: 'Output ready' }
	]
}

function text(html: string) {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}

describe('preview error reporting', () => {
	test('preserves an empty summary for an unrecognized status', () => {
		const result = render(WorkflowConsole, { props: { status: 'unknown', phases: [], logs: {} } })
		expect(result.body).not.toContain('status-title')
		expect(result.body).not.toContain('status-sub')
	})

	test.each(['failed', 'running', 'completed', 'expired'])(
		'shows the existing error strip only for failed status: %s',
		(status) => {
			const result = render(WorkflowConsole, {
				props: { status, phases: [], logs: {}, errorMessage: 'Render failed' }
			})
			expect(result.body.includes('error-strip')).toBe(status === 'failed')
			expect(text(result.body).includes('Render failed')).toBe(status === 'failed')
		}
	)
})

describe('preview phases and logs', () => {
	test('renders preview logs with auto-scroll locked by default', () => {
		const result = render(WorkflowConsole, {
			props: {
				status: 'completed',
				phases,
				logs
			}
		})
		expect(result.body).not.toContain('Completed')
		expect(text(result.body)).toContain('1 lines')
		expect(result.body).toContain('Auto-scroll locked')
	})

	test('omits the timeline without phases and log panels without logs', () => {
		const empty = render(WorkflowConsole, {
			props: { status: 'enqueued', phases: [], logs: {} }
		})
		expect(empty.body).not.toContain('class="timeline')
		const withoutLogs = render(WorkflowConsole, {
			props: { status: 'completed', phases, logs: {} }
		})
		expect(withoutLogs.body).toContain('class="timeline')
		expect(withoutLogs.body).not.toContain('class="log-console')
	})

	test('renders one timeline row for a retried phase using its latest state', () => {
		const result = render(WorkflowConsole, {
			props: {
				status: 'completed',
				phases: [
					{ ...phases[0], status: 'failed', message: 'First attempt failed' },
					{ ...phases[0], message: 'Retry succeeded' }
				],
				logs
			}
		})
		expect(result.body.match(/class="phase-name\b/g)).toHaveLength(1)
		expect(text(result.body)).toContain('Retry succeeded')
		expect(text(result.body)).not.toContain('First attempt failed')
	})

	test('scopes log viewport IDs to the rendered console', () => {
		const props = { status: 'completed', phases, logs }
		const first = render(WorkflowConsole, { props, idPrefix: 'first' })
		const second = render(WorkflowConsole, { props, idPrefix: 'second' })
		const viewportId = (body: string) => body.match(/id="([^"]+-log-container-render)"/)?.[1]
		expect(viewportId(first.body)).toBeTruthy()
		expect(viewportId(second.body)).toBeTruthy()
		expect(viewportId(first.body)).not.toBe(viewportId(second.body))
	})

	test('shows each phase duration rather than a total preview time', () => {
		const result = render(WorkflowConsole, {
			props: {
				status: 'completed',
				phases: [
					phases[0],
					{
						...phases[0],
						phase: 'publish',
						started_at: started + 65_000,
						finished_at: started + 90_000
					}
				],
				logs: {}
			}
		})
		expect(result.body).not.toContain('total time')
		expect(text(result.body)).toContain('25s')
	})

	test('retains phase statuses and stderr/error highlighting', () => {
		const items = ['running', 'failed', 'skipped', 'waiting'].map((status) => ({
			...phases[0],
			phase: status,
			status
		}))
		const result = render(WorkflowConsole, {
			props: {
				status: 'failed',
				phases: items,
				logs: {
					failed: [
						{ ...logs.render[0], phase: 'failed', level: 'stderr', message: 'Failure details' }
					]
				}
			}
		})
		for (const { status } of items) expect(result.body).toContain(`status-${status}`)
		expect(result.body).toContain('spin')
		expect(result.body).toContain('is-error')
		expect(text(result.body)).toContain('Failure details')
	})

	test.each(['stdout', 'info', 'stderr', 'error'])(
		'highlights only error log levels: %s',
		(level) => {
			const result = render(WorkflowConsole, {
				props: {
					status: 'completed',
					phases,
					logs: { render: [{ ...logs.render[0], level }] }
				}
			})
			const rowClasses = result.body.match(/class="(log-row[^"]*)"/)?.[1]
			expect(rowClasses).toBeTruthy()
			expect(rowClasses?.includes('is-error')).toBe(level === 'stderr' || level === 'error')
		}
	)

	test('escapes preview errors, phase messages, and logs', () => {
		const unsafe = '<script>not executable</script>'
		const result = render(WorkflowConsole, {
			props: {
				status: 'failed',
				errorMessage: unsafe,
				phases: [{ ...phases[0], message: unsafe }],
				logs: { render: [{ ...logs.render[0], message: unsafe }] }
			}
		})
		expect(result.body).not.toContain('<script>')
		expect(result.body).toContain('&lt;script>')
	})
})
