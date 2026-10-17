import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// Source guards cover handler wiring, not browser EventSource behavior.
test.each(['publish/+page.svelte', 'piece/[...path]/preview/[jobId]/+layout.svelte'])(
	'%s marks only a closed stream as disconnected, leaving job status alone',
	(file) => {
		const source = readFileSync(new URL(file, import.meta.url), 'utf8')
		const handler = source.match(/eventSource\.addEventListener\('error',[\s\S]*?\n\t\t\}\)/)?.[0]
		expect(handler).toContain(
			'if (eventSource?.readyState === EventSource.CLOSED) streamDisconnected = true'
		)
		expect(handler).not.toMatch(/\bstatus\s*=|\.close\(|signin|401|403/)
		expect(source).toMatch(/streamDisconnected = false\s+eventSource = new EventSource/)
	}
)

test('Publish uses its existing status title and stops the spinner when disconnected', () => {
	const source = readFileSync(new URL('./publish/+page.svelte', import.meta.url), 'utf8')
	expect(source).toMatch(
		/<div class="status-text">\s*\{#if streamDisconnected\}\s*<div class="status-title">Refresh to reconnect<\/div>/
	)
	expect(source).toContain("{#if status === 'running' && !streamDisconnected}")
})
