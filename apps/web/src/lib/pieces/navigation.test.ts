import { expect, test } from 'vitest'
import { editorHref, previewHref, publishedHref, publishHref } from './navigation'

test('archive filenames and preview jobs remain path segments, not URL queries or fragments', () => {
	const file = 'books/雪 #?%.books.md'
	const root = '/admin/piece/books/%E9%9B%AA%20%23%3F%25.books.md'

	expect(editorHref(file)).toBe(`${root}/source`)
	expect(publishedHref(file)).toBe(`${root}/published`)
	expect(previewHref(file)).toBe(`${root}/preview`)
	expect(previewHref(file, 'job #?%')).toBe(`${root}/preview/job%20%23%3F%25`)
})

test('a percent-looking filename is encoded literally rather than becoming another path segment', () => {
	expect(editorHref('books/literal%2F.books.md')).toBe(
		'/admin/piece/books/literal%252F.books.md/source'
	)
})

test('publish preselection retains the complete filename as one query value', () => {
	const file = 'nested/name?check=0&file=other#fragment + 雪.books.md'

	const url = new URL(publishHref(file), 'https://app.test')

	expect(url.pathname).toBe('/admin/publish')
	expect(url.hash).toBe('')
	expect([...url.searchParams.entries()]).toEqual([
		['check', '1'],
		['file', file]
	])
})
