import { expect, test } from 'vitest'
import { render } from 'svelte/server'
import WorkflowConsole from './WorkflowConsole.svelte'
import type { ProgressPhase } from '#lib/components/progress.js'

const started = Date.parse('2026-01-02T03:04:00Z')
const phase: ProgressPhase = {
	phase: 'render',
	status: 'completed',
	started_at: started,
	finished_at: started + 65_000,
	message: 'Retry succeeded'
}

function text(html: string) {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}

test('renders the latest attempt with its phase logs and keeps logless steps visible', () => {
	const { body } = render(WorkflowConsole, {
		props: {
			status: 'completed',
			phases: [
				{ ...phase, status: 'failed', message: 'First attempt failed' },
				{ ...phase, phase: 'assets', message: 'Assets ready' },
				phase
			],
			logs: {
				render: [
					{ phase: 'render', line_number: 1, ts: started, level: 'stdout', message: 'Output ready' }
				]
			}
		}
	})

	const headings = [...body.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map((match) => text(match[1]))
	expect(headings).toEqual(['render', 'assets'])
	expect(text(body)).not.toContain('First attempt failed')
	expect(text(body)).toContain('Retry succeeded')
	expect(text(body)).toContain('Output ready')
	expect(text(body)).toContain('Assets ready')
	expect(body).toContain('aria-label="assets output"')
	expect(text(body)).toContain('No output recorded.')
})

test('shows an escaped job error only when the preview has failed', () => {
	const props = {
		phases: [],
		logs: {},
		errorMessage: '<script>Render failed & stopped</script>'
	}
	const failed = render(WorkflowConsole, { props: { ...props, status: 'failed' } }).body
	const running = render(WorkflowConsole, { props: { ...props, status: 'running' } }).body

	expect(failed).toContain('&lt;script>Render failed &amp; stopped&lt;/script>')
	expect(failed).not.toContain('<script>')
	expect(text(running)).not.toContain('Render failed')
})
