import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import type { WebPieces } from '@luzzle/web.db'
import Page from './+page.svelte'

const now = Date.parse('2026-01-02T12:00:00Z')
const piece: WebPieces = {
	id: 'book-1',
	key: 'book-1',
	title: 'A book',
	slug: 'a-book',
	file_path: 'books/a-book.books.md',
	type: 'books',
	date_added: now - 3600000,
	date_updated: now - 120000,
	json_metadata: '{}'
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(now)
})
afterEach(() => vi.useRealTimers())

function html(pieces = [piece]) {
	return render(Page, {
		props: {
			data: {
				pieceTypes: ['books'],
				config: {
					content: { text: { title: 'Garden', description: '' } },
					url: { app: 'http://localhost', app_assets: '', luzzle_assets: '' }
				},
				meta: { title: 'Dashboard' },
				pieceStats: { total: pieces.length, byType: [] },
				fileCount: pieces.length,
				recentlyEditedPieces: pieces,
				lastPublish: null,
				setup: {
					pieceTypeCount: 1,
					aiConfigured: false,
					authType: 'local',
					archiveSyncConfigured: false,
					cdnSyncConfigured: false
				}
			}
		} satisfies ComponentProps<typeof Page>
	}).body.replace(/<!--[\s\S]*?-->/g, '')
}

test('each recent row is one native link containing title, type, and updated time', () => {
	const output = html([piece, { ...piece, id: 'book-2', file_path: 'books/another.books.md' }])
	const list = output.match(/<ul\b[^>]*class="recent-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/)?.[1]
	const rows = [...(list ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)]
	expect(rows).toHaveLength(2)
	for (const [index, [, row]] of rows.entries()) {
		expect(row).toMatch(/^\s*<a\b[^>]*class="recent-row[^"]*"[^>]*>[\s\S]*<\/a>\s*$/)
		expect(row.match(/<a\b/g)).toHaveLength(1)
		expect(row).toContain(
			`href="/admin/piece/books/${index === 0 ? 'a-book' : 'another'}.books.md/source"`
		)
		expect(row).toMatch(/<span\b[^>]*class="recent-title[^"]*"[^>]*>A book<\/span>/)
		expect(row).toMatch(/<span\b[^>]*class="recent-type[^"]*"[^>]*>books<\/span>/)
		expect(row).toMatch(/<span\b[^>]*class="recent-updated[^"]*"[^>]*>\s*2 minutes ago\s*<\/span>/)
	}
})

test('recent rows retain the slug and added-time fallbacks', () => {
	const output = html([{ ...piece, title: '', date_updated: undefined }])
	expect(output).toMatch(/class="recent-title[^"]*"[^>]*>a-book<\/span>/)
	expect(output).toContain('1 hour ago')
})

test('the recently edited section stays hidden when empty', () => {
	expect(html([])).not.toContain('recent-list')
})
