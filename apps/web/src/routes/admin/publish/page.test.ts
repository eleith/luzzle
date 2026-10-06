import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import Page from './+page.svelte'
import type { RunView } from './+page.server.js'

vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }))
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/admin/publish') } }))

function html(
	failedPieces = [{ filePath: 'failed.book.md', message: 'missing attachment' }],
	phases: RunView['phases'] = []
) {
	const data = {
		meta: { title: 'Publish' },
		config: {
			url: { app: 'http://localhost', app_assets: '', luzzle_assets: '' },
			content: { text: { title: 'Test', description: '' } }
		},
		audit: null,
		publish: {
			jobId: 'publish-id',
			state: 'completed',
			errors: null,
			phases,
			logs: [],
			failedPieces,
			diff: {
				schemas: { added: [], updated: [], pruned: [] },
				pieces: { added: ['failed.book.md', 'healthy.book.md'], updated: [], pruned: [] }
			}
		}
	}
	return render(Page, { props: { data } as ComponentProps<typeof Page> }).body
}

test('a completed partial publish stays visible after reload without an all-success claim', () => {
	const output = html()
	expect(output).toContain('Publish finished with errors')
	expect(output).toContain('missing attachment')
	expect(output).toContain('asset generation failed')
	expect(output).toContain('/admin/piece/failed.book.md/source')
	expect(output).not.toContain('/admin/piece/failed.book.md/live')
	expect(output).toContain('/admin/piece/healthy.book.md/live')
	expect(output).not.toContain('Published successfully')
	expect(output).toContain('role="alert"')
})

test('failed-piece editor links encode filenames with URL delimiters', () => {
	const output = html([{ filePath: 'books/chapter#1?%.book.md', message: 'missing image' }])
	expect(output).toContain('/admin/piece/books/chapter%231%3F%25.book.md/source')
})

test('partial reports retain one timeline row per retried phase and count stages correctly', () => {
	const phase = {
		job_id: 'publish-id',
		phase: 'cdn.sync',
		started_at: 1000,
		finished_at: 2000,
		message: null
	}
	const output = html(undefined, [
		{ ...phase, status: 'failed' },
		{ ...phase, status: 'completed', started_at: 2000, finished_at: 3000 }
	])
	expect(output).toContain('Publish finished with errors')
	expect(output.match(/class="phase-name(?:\s[^"]*)?"/g)).toHaveLength(1)
	expect(output.replace(/<!--[\s\S]*?-->/g, '')).toContain('1 stages')
})

test('ordinary completed history retains the existing idle publish screen', () => {
	const output = html([])
	expect(output).toContain('Publish changes')
	expect(output).not.toContain('Publish finished with errors')
	expect(output).not.toContain('Asset generation failed')
})

test('failed-piece messages render as text rather than executable markup', () => {
	const output = html([{ filePath: 'failed.book.md', message: '<script>alert(1)</script>' }])
	expect(output).not.toContain('<script>alert(1)</script>')
	expect(output).toContain('&lt;script')
})
