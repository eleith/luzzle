import { expect, test } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import type { ProgressPhase, ProgressLog } from '$lib/components/progress'
import PreviewLogs from './PreviewLogs.svelte'
import PreviewFacts from './PreviewFacts.svelte'

const started = Date.parse('2026-01-02T03:04:00Z')
const phases: ProgressPhase[] = [
	{
		phase: 'render',
		status: 'completed',
		started_at: started,
		finished_at: started + 65_000,
		message: 'Rendered successfully'
	},
	{
		phase: 'assets',
		status: 'failed',
		started_at: started + 65_000,
		finished_at: started + 90_000,
		message: 'Asset failed'
	}
]
const logs: Record<string, ProgressLog[]> = {
	render: [
		{ phase: 'render', line_number: 1, ts: started, level: 'stdout', message: 'Output ready' },
		{
			phase: 'render',
			line_number: 2,
			ts: started + 1000,
			level: 'info',
			message: 'Recorded render detail'
		}
	],
	assets: [
		{
			phase: 'assets',
			line_number: 1,
			ts: started + 65_000,
			level: 'stderr',
			message: 'Recorded asset error'
		}
	]
}

function props(
	overrides: Partial<ComponentProps<typeof PreviewLogs>> = {}
): ComponentProps<typeof PreviewLogs> {
	return { status: 'completed', phases, logs, ...overrides }
}

function text(html: string) {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}

// SSR checks delegation and initial controls, not browser scrolling, SSE, or onMount behavior.
test('logs are a labelled section with an instance-scoped heading, not a main or H1', () => {
	const first = render(PreviewLogs, { props: props(), idPrefix: 'first' }).body
	const second = render(PreviewLogs, { props: props(), idPrefix: 'second' }).body
	const headingId = (html: string) => html.match(/<h2[^>]*id="([^"]+)"/)?.[1]
	for (const html of [first, second]) {
		expect(headingId(html)).toBeTruthy()
		expect(html).toContain(`aria-labelledby="${headingId(html)}"`)
		expect(html).toMatch(/<h2[^>]*>Preview logs<\/h2>/)
		expect(html).not.toContain('<h1')
		expect(html).not.toContain('<main')
	}
	expect(headingId(first)).not.toBe(headingId(second))
})

test('file metadata is preserved by facts rather than duplicated in the logs section', () => {
	const file = `${'nested folder/'.repeat(24)}雪 & <script>draft</script> #?%.books.md`
	const html = render(PreviewLogs, { props: props() }).body
	const facts = render(PreviewFacts, {
		props: { file, status: 'completed', phases, createdAt: null, finishedAt: null }
	}).body
	expect(facts).toContain(file.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
	expect(html).not.toContain('nested folder/')
	expect(facts).not.toContain('<script>')
	expect(facts).not.toContain('<a ')
	expect(html).not.toContain('class="meta')
	expect(html).not.toContain('Publication')
})

test.each([
	['expired', 'Expired', 'Assets are purged after 2 days. Re-run the preview from the editor.'],
	['enqueued', 'Queued', 'Waiting for worker…'],
	['running', 'Building', '1m 30s elapsed'],
	['failed', 'Failed', '1m 30s stopped at'],
	['completed', 'Completed', '1m 30s total time']
])(
	'keeps %s summary in the facts table while preserving phase/log delegation',
	(status, title, detail) => {
		const html = render(PreviewLogs, { props: props({ status }) }).body
		const facts = render(PreviewFacts, {
			props: { file: 'book.md', status, phases, createdAt: null, finishedAt: null }
		}).body
		expect(text(facts)).toContain(title)
		expect(text(facts)).toContain(detail)
		expect(facts).not.toContain('<svg')
		expect(facts).not.toContain('spin')
		expect(html).not.toContain(title)
		expect(html).not.toContain('status-card')
		expect(html).not.toContain('status-title')
		expect(html).toContain('timeline')
		expect(text(html)).toContain('Output ready')
		expect(text(html)).toContain('Recorded asset error')
	}
)

test.each(['waiting', 'future-state'])(
	'passes %s through without inventing console status copy',
	(status) => {
		const html = render(PreviewLogs, { props: props({ status, phases: [], logs: {} }) }).body
		expect(html).not.toContain('status-card')
		expect(html).not.toContain('status-title')
		expect(html).not.toContain('status-sub')
		expect(text(html)).toBe('Preview logs')
	}
)

test('preserves native phase groups, timing, log content and initial lock controls', () => {
	const html = render(PreviewLogs, { props: props() }).body
	const content = text(html)
	for (const expected of [
		'render',
		'assets',
		'Rendered successfully',
		'Asset failed',
		'1m 5s',
		'25s',
		'2 lines',
		'1 lines',
		'03:04:00',
		'03:04:01',
		'03:05:05',
		'Output ready',
		'Recorded render detail',
		'Recorded asset error'
	])
		expect(content).toContain(expected)
	expect(html.match(/class="log-viewport/g)).toHaveLength(2)
	expect(html.match(/<button /g)).toHaveLength(2)
	expect(html.match(/title="Auto-scroll locked"/g)).toHaveLength(2)
	expect(html).toMatch(/class="log-row[^"]*\bis-error\b[^"]*"/)
	expect(html).toContain('-log-container-render')
	expect(html).toContain('-log-container-assets')
})

test.each(['failed', 'running', 'completed', 'expired'])(
	'passes optional errors through with native failed-only visibility: %s',
	(status) => {
		const html = render(PreviewLogs, {
			props: props({ status, errorMessage: '<script>Failure & details</script>' })
		}).body
		expect(html.includes('error-strip')).toBe(status === 'failed')
		expect(html.includes('&lt;script>Failure &amp; details&lt;/script>')).toBe(status === 'failed')
		expect(html).not.toContain('<script>')
	}
)

test('phase and log content remain escaped through delegation', () => {
	const unsafe = '<script>not executable & not hidden</script>'
	const html = render(PreviewLogs, {
		props: props({
			phases: [{ ...phases[0], message: unsafe }],
			logs: { render: [{ ...logs.render[0], message: unsafe }] }
		})
	}).body
	expect(html.match(/&lt;script>not executable &amp; not hidden&lt;\/script>/g)).toHaveLength(2)
	expect(html).not.toContain('<script>')
})

test('empty queued data does not invent phases, logs or controls', () => {
	const html = render(PreviewLogs, {
		props: props({ status: 'enqueued', phases: [], logs: {} })
	}).body
	expect(text(html)).toBe('Preview logs')
	expect(html).not.toContain('class="timeline')
	expect(html).not.toContain('class="log-console')
	expect(html).not.toContain('<button ')
	expect(html).not.toContain('error-strip')
})
