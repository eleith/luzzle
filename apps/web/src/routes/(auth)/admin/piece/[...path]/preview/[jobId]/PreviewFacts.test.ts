import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import type { ProgressPhase } from '$lib/components/progress.js'
import PreviewFacts from './PreviewFacts.svelte'

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

test('fixed UI copy is literal markup rather than JavaScript label maps', () => {
	const source = readFileSync(new URL('./PreviewFacts.svelte', import.meta.url), 'utf8')
	const markup = source
		.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '')
		.replace(/\{[^}]*\}/g, '')
		.replace(/\s+/g, ' ')

	expect(source).not.toMatch(/\b(?:statusLabels|durationLabels)\b|\bnew\s+Map\s*\(/)
	for (const label of [
		'Preview',
		'File',
		'Type',
		'State',
		'Duration',
		'Created',
		'Finished',
		'Unknown',
		'Queued',
		'Building',
		'Completed',
		'Failed',
		'Expired',
		'Waiting for worker…',
		'Assets are purged after 2 days. Re-run the preview from the editor.',
		'elapsed',
		'total time',
		'stopped at',
		'UTC'
	])
		expect(markup).toContain(label)
})

test('facts have no state icon imports, markup, classification, motion, or local badge styles', () => {
	const source = readFileSync(new URL('./PreviewFacts.svelte', import.meta.url), 'utf8')
	const style = source.match(/<style>([\s\S]*?)<\/style>/)?.[1]
	expect(style).toBeDefined()
	expect(source).not.toMatch(
		/virtual:icons|<svg\b|status-icon|status-\{|spin|@keyframes|prefers-reduced-motion/
	)
	expect(style).not.toMatch(/\.status\s*\{|data-status|background|animation|transform/)
	expect(source).toContain('<span class="status" data-status={knownStatus ? status : \'unknown\'}>')
})

test('shared overview styles give Published and Preview identical badge colors and neutral pending states', () => {
	const source = readFileSync(
		new URL('../../../../../../../lib/pieces/viewer/PieceOverview.svelte', import.meta.url),
		'utf8'
	)
	const base = source.match(/\.overview\s+:global\(\.overview-facts \.status\)\s*\{([^}]+)\}/)?.[1]
	expect(base?.replace(/\s+/g, ' ').trim()).toBe(
		'display: inline-block; padding: var(--space-1) var(--space-2); border-radius: var(--radius-small); font-size: inherit; font-weight: var(--font-weight-medium); background: var(--color-surface-container-highest); color: var(--color-on-surface-variant);'
	)
	const blocks = [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
	for (const [status, tone] of [
		['matching', 'primary'],
		['completed', 'primary'],
		['changed', 'secondary'],
		['running', 'secondary'],
		['failed', 'error']
	]) {
		const block = blocks.find(([, selector]) =>
			selector.includes(`.overview :global(.overview-facts .status[data-status='${status}'])`)
		)
		expect(block, status).toBeDefined()
		expect(block?.[2]).toContain(`background: var(--color-${tone}-container);`)
		expect(block?.[2]).toContain(`color: var(--color-on-${tone}-container);`)
	}
	for (const status of ['waiting', 'enqueued', 'expired', 'unknown'])
		expect(source).not.toMatch(new RegExp(`data-status=['"]${status}['"]`))
})

test('Preview facts have the six actual fields and explicit mobile table semantics', () => {
	const html = facts()
	expect(html).toContain('class="overview-facts"')
	expect(html).toMatch(/<table[^>]*role="table"/)
	expect(html.match(/<table\b/g)).toHaveLength(1)
	expect(html).toContain('<caption>Preview</caption>')
	expect(html).toMatch(/<tbody[^>]*role="rowgroup"/)
	expect(html.match(/<tr[^>]*role="row"/g)).toHaveLength(6)
	expect(html.match(/<th[^>]*scope="row"[^>]*role="rowheader"/g)).toHaveLength(6)
	expect(html.match(/<td[^>]*role="cell"/g)).toHaveLength(6)
	expect(rows(html)).toEqual([
		['File', 'books/a-book.books.md'],
		['Type', 'books'],
		['State', 'Completed'],
		['Duration', 'Unknown'],
		['Created', '1/2/2026, 3:04:05 AM UTC'],
		['Finished', '1/2/2026, 3:05:06 AM UTC']
	])
	for (const excluded of [
		'<h1',
		'<main',
		'<a ',
		'status-card',
		'Title',
		'Source',
		'Publication',
		'Last publish',
		'Matches publish',
		'Unpublished changes',
		'URL',
		'Started'
	])
		expect(html).not.toContain(excluded)
})

test.each([
	['waiting', 'Queued Waiting for worker…'],
	['enqueued', 'Queued Waiting for worker…'],
	['running', 'Building'],
	['completed', 'Completed'],
	['failed', 'Failed'],
	['expired', 'Expired Assets are purged after 2 days. Re-run the preview from the editor.']
])('state %s retains facts with the agreed label %s', (status, label) => {
	const html = facts({ status, finishedAt: null })
	expect(html).toMatch(new RegExp(`<span class="status" data-status="${status}">`))
	const fields = rows(html)
	expect(fields).toEqual([
		['File', 'books/a-book.books.md'],
		['Type', 'books'],
		['State', label],
		['Duration', 'Unknown'],
		['Created', '1/2/2026, 3:04:05 AM UTC'],
		['Finished', 'Unknown']
	])
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

test.each(['completed', 'running', 'enqueued', 'waiting', 'failed', 'expired'])(
	'%s uses the same icon-free State badge element and closed status attribute',
	(status) => {
		const html = facts({ status })
		const cell = html.match(/>State<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/)?.[1]
		expect(cell).toBeDefined()
		expect(cell!.match(/<span\b/g)).toHaveLength(1)
		expect(cell).toContain(`<span class="status" data-status="${status}">`)
		expect(cell).not.toContain('status-icon')
		expect(html).not.toContain('<svg')
		expect(html).not.toContain('spin')
		expect(field(html, 'State')).toBeTruthy()
	}
)

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
