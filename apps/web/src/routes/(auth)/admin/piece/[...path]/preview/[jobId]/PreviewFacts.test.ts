import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import type { ProgressPhase } from '#lib/components/progress.js'
import PreviewFacts from './PreviewFacts.svelte'

vi.mock('$app/forms', () => ({ enhance: vi.fn() }))
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: { path: string }) =>
		route.replace('/(auth)', '').replace('[...path]', () => params.path)
}))

function facts(overrides: Partial<ComponentProps<typeof PreviewFacts>> = {}) {
	return render(PreviewFacts, {
		props: {
			file: 'books/a-book.books.md',
			type: 'books',
			status: 'completed',
			createdAt: '2026-01-02T03:04:05.000Z',
			finishedAt: '2026-01-02T03:05:06.000Z',
			...overrides
		}
	}).body
}

function rows(html: string) {
	return [...html.matchAll(/<th[^>]*>([^<]+)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g)].map(
		([, label, value]) => [
			label,
			value
				.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, '')
				.replace(/\s+/g, ' ')
				.trim()
		]
	)
}

function phase(overrides: Partial<ProgressPhase> = {}): ProgressPhase {
	return {
		phase: 'render',
		status: 'completed',
		started_at: 1000,
		finished_at: 3000,
		message: null,
		...overrides
	}
}

function field(html: string, name: string) {
	return rows(html).find(([label]) => label === name)?.[1]
}

test.each(['enqueued', 'running'])(
	'disconnection replaces the %s state label without inventing a job failure',
	(status) => {
		const html = facts({ status, streamDisconnected: true, finishedAt: null })
		expect(field(html, 'State')).toBe('Refresh to reconnect')
		expect(field(html, 'Finished')).toBe('Unknown')
		expect(html).toContain('data-status="unknown"')
		expect(html).not.toContain('Waiting for worker')
		expect(html).not.toContain('Failed')
		expect(html).not.toContain('role="alert"')
	}
)

test.each([
	['waiting', 'Queued Waiting for worker…'],
	['enqueued', 'Queued Waiting for worker…'],
	['running', 'Building'],
	['completed', 'Completed'],
	['failed', 'Failed'],
	['expired', 'Expired Assets are purged after 2 days.']
])('state %s retains facts with the agreed label %s', (status, label) => {
	const html = facts({ status, finishedAt: null })
	expect(html).toMatch(new RegExp(`<span class="status" data-status="${status}">`))
	expect(field(html, 'State')).toBe(label)
	expect(field(html, 'File')).toBe('books/a-book.books.md')
	expect(field(html, 'Finished')).toBe('Unknown')
})

test('missing type is Unknown without inferring any identity', () => {
	expect(field(facts({ type: undefined }), 'Type')).toBe('Unknown')
})

test('type content is escaped rather than interpreted as markup', () => {
	const html = facts({ type: '<script>books & films</script>' })
	expect(html).toContain('&lt;script>books &amp; films&lt;/script>')
	expect(html).not.toContain('<script>')
})

test.each([
	'future-state',
	'constructor',
	'toString',
	'<script>unknown & state</script>',
	'completed" data-status="failed'
])('unknown state %s is preserved as escaped text', (status) => {
	const html = facts({ status })
	const escaped = status.replace(/&/g, '&amp;').replace(/</g, '&lt;')
	expect(field(html, 'State')).toBe(escaped)
	expect(html).toContain('class="status" data-status="unknown"')
	expect(html).not.toContain('<svg')
	expect(field(html, 'Duration')).toBe('Unknown')
	expect(html).not.toContain('<script>')
})

test('uses actual metadata ISO times normalized to UTC with published en-US formatting', () => {
	const html = facts({
		createdAt: '2026-01-02T05:04:05+02:00',
		finishedAt: '2026-01-02T05:05:06+02:00'
	})
	expect(html).toContain('datetime="2026-01-02T03:04:05.000Z"')
	expect(html).toContain('datetime="2026-01-02T03:05:06.000Z"')
	expect(rows(html).slice(4)).toEqual([
		['Created', '1/2/2026, 3:04:05 AM UTC'],
		['Finished', '1/2/2026, 3:05:06 AM UTC']
	])
})

test.each([null, '', 'not-a-date', '2026-99-99T99:99:99Z', '999999999999999999999'])(
	'missing or invalid metadata %j remains Unknown without throwing',
	(value) => {
		const html = facts({ createdAt: value, finishedAt: value })
		expect(rows(html).slice(4)).toEqual([
			['Created', 'Unknown'],
			['Finished', 'Unknown']
		])
		expect(html).not.toContain('<time')
	}
)

test('epoch zero is a known timestamp in either field', () => {
	const html = facts({
		createdAt: '1970-01-01T00:00:00.000Z',
		finishedAt: '1970-01-01T00:00:00.000Z'
	})
	expect(html.match(/datetime="1970-01-01T00:00:00.000Z"/g)).toHaveLength(2)
	expect(rows(html).slice(4)).toEqual([
		['Created', '1/1/1970, 12:00:00 AM UTC'],
		['Finished', '1/1/1970, 12:00:00 AM UTC']
	])
})

test('date fields are independent: a bad Created value cannot hide an actual Finished value', () => {
	const html = facts({ createdAt: 'invalid' })
	expect(rows(html).slice(4)).toEqual([
		['Created', 'Unknown'],
		['Finished', '1/2/2026, 3:05:06 AM UTC']
	])
	expect(html.match(/<time /g)).toHaveLength(1)
})

test('the entire raw filename is escaped, direction-isolated, and available as its title', () => {
	const file = `folder/${'long'.repeat(80)}/<img src=x onerror="bad"> & אבג.books.md`
	const html = facts({ file })
	expect(field(html, 'File')).toBe(file.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
	expect(html).toMatch(/<bdi dir="ltr" class="file[^"]*" title="folder\//)
	expect(html).toContain(
		'title="' + file.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') + '"'
	)
	expect(html.replace(/"[^"]*"/g, '')).not.toContain('<img')
	expect(html).not.toContain('<a ')
})

test.each([
	['completed', '2s total time'],
	['running', '2s elapsed'],
	['failed', '2s stopped at'],
	['expired', '2s total time']
])('%s shows the measured duration kind in its own row', (status, expected) => {
	const html = facts({ status, phases: [phase()] })
	expect(field(html, 'Duration')).toBe(expected)
	expect(field(html, 'State')).not.toContain('2s')
})

test.each(['completed', 'running', 'failed', 'expired'])(
	'%s without phase timings is honest Unknown rather than a fabricated zero',
	(status) => {
		const html = facts({ status, phases: [] })
		expect(field(html, 'Duration')).toBe('Unknown')
		expect(html).not.toContain('0s')
	}
)

test('epoch-zero phase timing is measured rather than discarded', () => {
	expect(field(facts({ phases: [phase({ started_at: 0, finished_at: 2000 })] }), 'Duration')).toBe(
		'2s total time'
	)
})

test('invalid phase times remain Unknown and do not alter authoritative metadata dates', () => {
	const html = facts({ phases: [phase({ started_at: NaN })] })
	expect(field(html, 'Duration')).toBe('Unknown')
	expect(rows(html).slice(4)).toEqual(rows(facts()).slice(4))
})

test('valid phase times cannot invent missing metadata dates or use queue time as duration', () => {
	const html = facts({ createdAt: null, finishedAt: null, phases: [phase()] })
	expect(field(html, 'Duration')).toBe('2s total time')
	expect(rows(html).slice(4)).toEqual([
		['Created', 'Unknown'],
		['Finished', 'Unknown']
	])
	expect(html).not.toContain('<time')
})

test('terminal missing finish does not display an ever-growing elapsed time', () => {
	const html = facts({ finishedAt: null, phases: [phase({ finished_at: null })] })
	expect(field(html, 'Duration')).toBe('Unknown')
})
