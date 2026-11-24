import { expect, test, vi } from 'vitest'
import { reroute } from './hooks.js'

vi.mock('$app/env/public', () => ({
	LUZZLE_PAGE_TEMPLATES: { books: 'book', 'field notes': 'note', assets: 'default' },
	LUZZLE_ICON_TEMPLATES: {
		books: 'poster',
		'owner-designed': 'poster',
		'field notes': 'lined-notebook-paper',
		constructor: 'default',
		assets: 'default'
	}
}))

function route(url: URL) {
	return reroute({ url, fetch })
}

test.each([
	['/pieces/assets', '/templates/icon/default/assets'],
	['/pieces/assets/image.png', '/templates/page/default/assets/image.png'],
	['/pieces/books', '/templates/icon/poster/books'],
	['/pieces/books/', '/templates/icon/poster/books'],
	['/pieces/field%20notes', '/templates/icon/lined-notebook-paper/field%20notes'],
	['/%70ieces/%62ooks', '/templates/icon/poster/%62ooks'],
	['/%70ieces/%62ooks/a%2Fb%2520', '/templates/page/book/%62ooks/a%2Fb%2520'],
	['/pieces/constructor', '/templates/icon/default/constructor'],
	['/pieces/books/a%20title', '/templates/page/book/books/a%20title'],
	['/pieces/books/a%20title/', '/templates/page/book/books/a%20title'],
	['/pieces/field%20notes/a-title', '/templates/page/note/field%20notes/a-title']
])('synchronously reroutes %s without changing query state', (pathname, expected) => {
	const url = new URL(`${pathname}?page=2&sort=title&tag=a&tag=b`, 'https://garden.example')
	const original = url.href
	expect(route(url)).toBe(expected)
	expect(url.href).toBe(original)
})

test.each([
	'/pieces',
	'/pieces/',
	'/pieces/unknown',
	'/pieces/unknown/slug',
	'/pieces/owner-designed/title',
	'/pieces/toString',
	'/%E0%A4%A/books/title',
	'/pieces/%E0%A4%A',
	'/pieces/%E0%A4%A/slug',
	'/pieces/books//',
	'/pieces/books/slug/extra',
	'/templates/icon/poster/books'
])('leaves %s to ordinary Kit handling', (pathname) => {
	expect(route(new URL(pathname, 'https://garden.example'))).toBeUndefined()
})
