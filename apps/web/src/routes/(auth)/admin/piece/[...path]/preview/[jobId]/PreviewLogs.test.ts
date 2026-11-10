import { expect, test } from 'vitest'
import { render } from 'svelte/server'
import PreviewLogs from './PreviewLogs.svelte'

// This wrapper owns the labelled section and forwarding, not StepLog's controls.
test('labels the preview log section and forwards phase, output and failure details', () => {
	const started = Date.parse('2026-01-02T03:04:00Z')
	const { body } = render(PreviewLogs, {
		props: {
			status: 'failed',
			errorMessage: 'Preview job failed',
			phases: [
				{
					phase: 'render',
					status: 'failed',
					started_at: started,
					finished_at: started + 65_000,
					message: 'Renderer stopped'
				}
			],
			logs: {
				render: [
					{
						phase: 'render',
						line_number: 1,
						ts: started,
						level: 'stderr',
						message: 'Missing template'
					}
				]
			}
		}
	})

	const heading = body.match(/<h2\b[^>]*id="([^"]+)"[^>]*>Preview logs<\/h2>/)
	expect(heading).not.toBeNull()
	expect(body).toContain(`aria-labelledby="${heading?.[1]}"`)
	expect(body).toContain('Preview job failed')
	expect(body).toMatch(/<h3\b[^>]*>render<\/h3>/)
	expect(body).toContain('Renderer stopped')
	expect(body).toContain('Missing template')
})
