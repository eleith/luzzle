import { expect, test, vi } from 'vitest'
import { reroute } from './hooks.js'

vi.mock('$app/env/public', () => ({
	LUZZLE_PAGE_TEMPLATES: { books: 'book', 'field notes': 'note', assets: 'default' },
	LUZZLE_ICON_TEMPLATES: {
		books: 'poster',
		'field notes': 'lined-notebook-paper',
		constructor: 'default',
		assets: 'default'
	}
}))

function route(url: URL) {
	return reroute({ url, fetch })
}

test.each([
	['/pieces/books', '/templates/icon/poster/books'],
	['/pieces/books/', '/templates/icon/poster/books'],
	['/pieces/field%20notes', '/templates/icon/lined-notebook-paper/field%20notes'],
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
	'/pieces/toString',
	'/pieces/assets',
	'/pieces/%61ssets/',
	'/pieces/assets/image.png',
	'/pieces/%E0%A4%A',
	'/pieces/%E0%A4%A/slug',
	'/pieces/books//',
	'/pieces/books/slug/extra',
	'/templates/icon/poster/books'
])('leaves %s to ordinary Kit handling', (pathname) => {
	expect(route(new URL(pathname, 'https://garden.example'))).toBeUndefined()
})
