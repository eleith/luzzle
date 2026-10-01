import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import ProgressConsole from './ProgressConsole.svelte'
import WorkflowConsole from '../../routes/admin/piece/[...path]/preview/[jobId]/WorkflowConsole.svelte'
import type { ProgressPhase, ProgressLog } from './progress.js'

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

beforeEach(() => {
	vi.spyOn(Date, 'now').mockReturnValue(started + 75_000)
})
afterEach(() => vi.restoreAllMocks())

describe('preview compatibility wrapper', () => {
	test.each([
		[
			'expired',
			'Preview expired',
			'Assets are purged after 2 days. Re-run the preview from the editor.'
		],
		['enqueued', 'Enqueued', 'Waiting for worker…'],
		['running', 'Rendering preview', '1m 5s elapsed'],
		['failed', 'Preview failed', '1m 5s stopped at'],
		['completed', 'Preview completed', '1m 5s total time']
	])('retains wording and duration for %s', (status, title, subtitle) => {
		const result = render(WorkflowConsole, { props: { status, phases, logs } })
		expect(text(result.body)).toContain(`${title} ${subtitle}`)
		expect(result.body).toContain(`status-${status}`)
		expect(result.body).toContain('phase-icon')
		expect(result.body).toContain('log-viewport')
		expect(text(result.body)).toContain('Rendered successfully')
		expect(text(result.body)).toContain('03:04:00')
		expect(text(result.body)).toContain('Output ready')
	})

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

describe('shared progress presentation', () => {
	test('accepts caller wording and progress/log rows without job IDs', () => {
		const result = render(ProgressConsole, {
			props: {
				status: 'completed',
				statusText: { title: 'Content ready', durationLabel: 'finished in' },
				phases,
				logs
			}
		})
		expect(text(result.body)).toContain('Content ready 1m 5s finished in')
		expect(text(result.body)).not.toContain('Preview')
		expect(text(result.body)).not.toContain('worker')
		expect(text(result.body)).toContain('1 lines')
		expect(result.body).toContain('Auto-scroll locked')
	})

	test.each([
		[[], '0s'],
		[[{ ...phases[0], started_at: 0 }], '0s'],
		[[{ ...phases[0], finished_at: null }], '1m 15s'],
		[[{ ...phases[0], finished_at: started + 5000 }], '5s'],
		[[{ ...phases[0], finished_at: started - 1000 }], '0s']
	])('retains elapsed-time formatting for %j', (items, duration) => {
		const result = render(ProgressConsole, {
			props: {
				status: 'running',
				statusText: { title: 'Working', durationLabel: 'elapsed' },
				phases: items,
				logs: {}
			}
		})
		expect(text(result.body)).toContain(`Working ${duration} elapsed`)
	})

	test('retains phase statuses and stderr/error highlighting', () => {
		const items = ['running', 'failed', 'skipped', 'waiting'].map((status) => ({
			...phases[0],
			phase: status,
			status
		}))
		const result = render(ProgressConsole, {
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

	test('escapes caller titles, messages, and logs', () => {
		const unsafe = '<script>not executable</script>'
		const result = render(ProgressConsole, {
			props: {
				status: 'failed',
				statusText: { title: unsafe, description: unsafe },
				errorMessage: unsafe,
				phases: [{ ...phases[0], message: unsafe }],
				logs: { render: [{ ...logs.render[0], message: unsafe }] }
			}
		})
		expect(result.body).not.toContain('<script>')
		expect(result.body).toContain('&lt;script>')
	})
})
