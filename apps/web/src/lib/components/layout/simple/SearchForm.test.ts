import { render } from 'svelte/server'
import { beforeEach, expect, test, vi } from 'vitest'
import SearchForm from './SearchForm.svelte'

const { page, mount, resolve } = vi.hoisted(() => {
	const mount = { prefix: '' }
	return {
		mount,
		page: {
			url: new URL('https://garden.test/search'),
			data: {} as Partial<App.PageData>
		},
		resolve: vi.fn((path: string) => `${mount.prefix}/${path}`)
	}
})
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/paths', () => ({ resolve }))
vi.mock('$app/navigation', () => ({ afterNavigate: vi.fn(), goto: vi.fn() }))

function decode(value: string) {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
}

function attribute(tag: string, name: string) {
	const value = tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]
	return value === undefined ? undefined : decode(value)
}

function inputs(html: string) {
	return html.match(/<input\b(?:[^>"']|"[^"]*"|'[^']*')*>/g) ?? []
}

function field(html: string, name: string) {
	const matches = inputs(html).filter((tag) => attribute(tag, 'name') === name)
	expect(matches).toHaveLength(1)
	return matches[0]
}

beforeEach(() => {
	page.url = new URL('https://garden.test/search')
	page.data = { pieceTypes: ['books', 'notes'] }
	mount.prefix = ''
	vi.clearAllMocks()
})

test('renders a real GET form, accessible query, and one named field per filter before JS', () => {
	const html = render(SearchForm).body
	const form = html.match(/<form\b[^>]*>/)?.[0] ?? ''
	expect(attribute(form, 'method')).toBe('GET')
	expect(attribute(form, 'action')).toBe('/search')
	expect(attribute(field(html, 'query'), 'type')).toBe('search')
	expect(attribute(field(html, 'query'), 'aria-label')).toBe('Search query')
	for (const name of ['query', 'type', 'after', 'before']) {
		expect(attribute(field(html, name), 'value')).toBe('')
	}
	expect(html).toMatch(/<button\b[^>]*type="submit"/)
	expect(html).not.toContain('Clear Filters')
	expect(html).not.toMatch(/\sautofocus(?:\s|=|>)/)
	expect(html).not.toContain('Close search')
	expect(html).not.toContain('has-close-button')
	expect(html).not.toContain('role="alert"')
})

test('filter props, including special characters, are in the actual SSR form fields', () => {
	const filters = {
		query: 'C++ & "tea" <title> #?% / 雪',
		type: 'books & "notes"',
		after: '2025-01-02',
		before: '2026-03-04'
	}
	page.url.search = '?query=not-the-prop&type=unrelated'
	page.data.pieceTypes = [filters.type]
	const html = render(SearchForm, { props: filters }).body
	for (const [name, value] of Object.entries(filters)) {
		expect(attribute(field(html, name), 'value')).toBe(value)
	}
	expect(html).toContain('Clear Filters')
	// The real BitsUI Select owns its single named input; no parallel type input.
	expect(attribute(field(html, 'type'), 'aria-hidden')).toBe('true')
	for (const name of ['after', 'before']) {
		expect(attribute(field(html, name), 'type')).toBe('hidden')
	}
})

test('native GET targets the resolved search path without carrying pagination or unrelated params', () => {
	mount.prefix = '/garden'
	page.url = new URL('https://garden.test/garden/search?query=old&page=9&unrelated=old')
	const html = render(SearchForm, { props: { query: 'tea' } }).body
	const form = html.match(/<form\b[^>]*>/)?.[0] ?? ''
	expect(attribute(form, 'action')).toBe('/garden/search')
	expect(resolve).toHaveBeenCalledWith('search')
	expect(attribute(field(html, 'query'), 'value')).toBe('tea')
	const names = inputs(html)
		.map((tag) => attribute(tag, 'name'))
		.filter(Boolean)
	expect(names.sort()).toEqual(['after', 'before', 'query', 'type'])
})

test('omitted filter props remain empty regardless of the current URL', () => {
	page.url.search = '?query=old&type=books&after=2025-01-02&before=2026-03-04'
	const html = render(SearchForm).body
	for (const name of ['query', 'type', 'after', 'before']) {
		expect(attribute(field(html, name), 'value')).toBe('')
	}
	expect(html).not.toContain('Clear Filters')
})

test('query and type IDs are scoped and the type label targets the real BitsUI trigger', () => {
	// Separate SSR roots use explicit prefixes, as required by Svelte. Within each
	// root, $props.id() supplies component-local IDs rather than fixed document IDs.
	const scopes = ['search-page', 'search-dialog'].map((idPrefix) => {
		const html = render(SearchForm, { idPrefix }).body
		const queryId = attribute(field(html, 'query'), 'id')
		const label = html.match(/<label\b[^>]*class="filter-label[^>]*>/)?.[0] ?? ''
		const typeId = attribute(label, 'for')
		expect(queryId).toContain(idPrefix)
		expect(typeId).toContain(idPrefix)
		expect(typeId).not.toBe(queryId)
		const trigger = (html.match(/<button\b[^>]*>/g) ?? []).find(
			(tag) => attribute(tag, 'id') === typeId
		)
		expect(trigger).toBeDefined()
		const ids = [...html.matchAll(/\sid="([^"]*)"/g)].map((match) => match[1])
		expect(new Set(ids).size).toBe(ids.length)
		return ids
	})
	expect(scopes[0].some((id) => scopes[1].includes(id))).toBe(false)
})

// SSR assertions cover initial HTML/native field structure only, not enhanced
// navigation, clear-button events, date-picker interaction, or dialog focus.
