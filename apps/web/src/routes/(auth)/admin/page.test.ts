import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import type { WebPieces } from '@luzzle/web.db'
import { resolve } from '$app/paths'
import { makePublicConfig } from '#lib/server/config.fixture.js'
import type { PieceStats } from '#lib/server/dashboardStats.js'
import type { DashboardView } from '#lib/server/load/dashboard.js'
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

function html(
	pieces = [piece],
	pieceStats: PieceStats = { total: pieces.length, byType: [] },
	edits: DashboardView['recentlyEditedPieces'] = []
) {
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
				recentlyPublishedPieces: pieces,
				recentlyEditedPieces: edits,
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

test('both recent sections explain their empty state', () => {
	const output = html([])
	expect(output).not.toContain('recent-list')
	expect(output).toContain('recently published')
	expect(output).toContain('No published pieces yet.')
	expect(output).toContain('pending publication')
	expect(output.indexOf('pending publication')).toBeLessThan(output.indexOf('recently published'))
	expect(output).toContain('No pieces pending publication.')
})

test('pending rows show draft or changes status instead of edit time, alongside their published version', () => {
	const edits: DashboardView['recentlyEditedPieces'] = [
		{
			...piece,
			title: 'Edited title',
			hasPublishedVersion: true,
			date_updated: piece.date_updated!
		},
		{
			...piece,
			id: 'draft',
			file_path: 'books/draft #1.books.md',
			title: 'New draft',
			hasPublishedVersion: false,
			date_updated: null
		}
	]
	const output = html([piece], { total: 1, byType: [] }, edits)
	const lists = [...output.matchAll(/<ul\b[^>]*class="recent-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/g)]
	expect(lists).toHaveLength(2)
	expect(lists[1][1]).toContain('A book')
	expect(lists[1][1]).not.toContain('Edited title')
	const rows = [...lists[0][1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1])
	expect(rows).toHaveLength(2)
	expect(rows[0]).toContain('Edited title')
	expect(rows[0]).toMatch(/class="recent-status[^"]*"[^>]*>\s*has changes\s*<\/span>/)
	expect(rows[0]).toContain('href="/admin/piece/books/a-book.books.md/source"')
	expect(rows[0]).not.toContain('2 minutes ago')
	expect(rows[1]).toContain('New draft')
	expect(rows[1]).toMatch(/class="recent-status[^"]*"[^>]*>\s*draft\s*<\/span>/)
	expect(rows[1]).toContain('href="/admin/piece/books/draft%20%231.books.md/source"')
	expect(rows[1]).not.toContain('1 hour ago')
	for (const row of rows) expect(row.match(/<a\b/g)).toHaveLength(1)
})

test('published rows display the successful publication timestamp when available', () => {
	const output = html([{ ...piece, last_published_at: now - 60000 }])
	expect(output).toContain('1 minute ago')
	expect(output).not.toContain('2 minutes ago')
})

// The native resolver receives already-encoded params, not an erased pathstring.
test('recent files preserve encoded archive segments in native route params', () => {
	const file = 'books/literal%2F/源 #?%.books.md'
	const path = 'books/literal%252F/%E6%BA%90%20%23%3F%25.books.md'
	const output = html([{ ...piece, file_path: file }])
	expect(resolve).toHaveBeenCalledWith('/(auth)/admin/piece/[...path]/source', { path })
	expect(output).toContain(`href="/admin/piece/${path}/source"`)
})
