import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import type { WebPieces } from '@luzzle/web.db'
import { resolve } from '$app/paths'
import { makePublicConfig } from '#lib/server/config.fixture.js'
import type { PieceStats } from '#lib/server/dashboardStats.js'
import Page from './+page.svelte'

vi.mock('$app/paths', () => ({
	resolve: vi.fn((route: string, params?: { path: string }) => {
		const path = route.replace('/(auth)', '').replace('[...path]', () => params?.path ?? '')
		return path.startsWith('/') ? path : `/${path}`
	})
}))

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
	vi.clearAllMocks()
	vi.useFakeTimers()
	vi.setSystemTime(now)
})
afterEach(() => vi.useRealTimers())

function html(pieces = [piece], pieceStats: PieceStats = { total: pieces.length, byType: [] }) {
	const config = makePublicConfig({
		url: { app: 'http://localhost', app_assets: '', luzzle_assets: '' }
	})
	config.content.text = { title: 'Garden', description: '' }
	return render(Page, {
		props: {
			data: {
				pieceTypes: ['books'],
				config,
				meta: { title: 'Dashboard' },
				pieceStats,
				fileCount: pieceStats.total,
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

test('type rows retain their name, count, browse link and type-specific create link', () => {
	const stats = {
		total: 15,
		byType: [
			{ type: 'books', count: 12 },
			{ type: 'films', count: 3 }
		]
	}
	const output = html([], stats)
	const body = output.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? ''
	const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => match[1])

	expect(rows).toHaveLength(stats.byType.length)
	for (const [index, { type, count }] of stats.byType.entries()) {
		const row = rows[index]
		expect(row).toContain(`href="/pieces/${type}"`)
		expect(row).toContain(`>${type}</a>`)
		expect(row).toMatch(new RegExp(`<td\\b[^>]*>\\s*${count.toLocaleString()}\\s*</td>`))
		expect(row).toContain(`href="/admin/pieces/create?type=${type}"`)
		expect(row).toContain(`aria-label="add ${type}"`)
	}
})

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

// The native resolver receives already-encoded params, not an erased pathstring.
test('recent files preserve encoded archive segments in native route params', () => {
	const file = 'books/literal%2F/源 #?%.books.md'
	const path = 'books/literal%252F/%E6%BA%90%20%23%3F%25.books.md'
	const output = html([{ ...piece, file_path: file }])
	expect(resolve).toHaveBeenCalledWith('/(auth)/admin/piece/[...path]/source', { path })
	expect(output).toContain(`href="/admin/piece/${path}/source"`)
})
