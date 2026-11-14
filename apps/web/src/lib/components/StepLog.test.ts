import { render } from 'svelte/server'
import { expect, test } from 'vitest'
import StepLog from './StepLog.svelte'

test('puts status above escaped terminal output and line count, seconds and lock below it', () => {
	const started = Date.parse('2026-01-02T03:04:00Z')
	const { body } = render(StepLog, {
		props: {
			phase: {
				phase: 'render',
				status: 'failed',
				started_at: started,
				finished_at: started + 65_000,
				message: '<script>Failure & details</script>'
			},
			logs: [
				{
					phase: 'render',
					line_number: 1,
					ts: started,
					level: 'stderr',
					message: '<img src=x> & output'
				}
			]
		}
	})

	const header = body.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1] ?? ''
	const footer = body.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? ''
	const headerStart = body.indexOf('<header')
	const terminalStart = body.indexOf('role="region"')
	const footerStart = body.indexOf('<footer')
	const terminal = body.slice(terminalStart, footerStart)

	expect(headerStart).toBeGreaterThanOrEqual(0)
	expect(terminalStart).toBeGreaterThan(headerStart)
	expect(footerStart).toBeGreaterThan(terminalStart)
	expect(header).toMatch(/<h3\b[^>]*>render<\/h3>/)
	expect(header).toContain('Failed')
	expect(header).not.toContain('aria-label="Auto-scroll"')
	// Keep the scrollable output named and keyboard-focusable, not just the lock button.
	expect(terminal).toContain('aria-label="render output"')
	expect(terminal).toContain('tabindex="0"')
	expect(terminal).toContain('&lt;script>Failure &amp; details&lt;/script>')
	expect(terminal).toContain('&lt;img src=x> &amp; output')
	expect(body).not.toMatch(/<(?:script|img)\b/)
	expect(
		footer
			.replace(/<[^>]+>/g, '')
			.replace(/\s+/g, ' ')
			.trim()
	).toBe('1 line 65s')
	expect(footer).toMatch(/<button\b[^>]*aria-label="Auto-scroll"/)
	expect(footer).toContain('aria-pressed="true"')
	expect(footer).toContain('title="Auto-scroll locked"')
})
