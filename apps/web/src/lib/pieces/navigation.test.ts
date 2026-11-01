import { existsSync } from 'node:fs'
import { expect, test, vi } from 'vitest'
import {
	editorHref,
	encodeArchivePath,
	previewHref,
	publishedHref,
	publishHref
} from './navigation'

const { resolve } = vi.hoisted(() => ({
	resolve: vi.fn(() => {
		throw new Error('Could not get the request store. This is an internal error.')
	})
}))
vi.mock('$app/paths', () => ({ resolve }))

test('Published replaces Live without keeping a legacy handler or redirect alias', () => {
	const routes = new URL('../../routes/(auth)/admin/piece/[...path]/', import.meta.url)
	expect(existsSync(new URL('live/', routes))).toBe(false)
	for (const file of [
		'published/+layout.server.ts',
		'published/+page.svelte',
		'published/page/+page.svelte',
		'published/icon/+page.svelte',
		'published/share/+page.svelte'
	])
		expect(existsSync(new URL(file, routes)), file).toBe(true)
})

test.each([
	'books/源 #?%.books.md',
	'folder with spaces/a book.books.md',
	'nested/literal%2F.books.md',
	'books/📚.books.md'
])(
	'editor navigation encodes raw file %s and job segments once without a request store',
	(file) => {
		const root = `/admin/piece/${file.split('/').map(encodeURIComponent).join('/')}`
		const job = 'job #?%'
		const links = [editorHref(file), publishedHref(file), previewHref(file), previewHref(file, job)]
		expect(links).toEqual([
			`${root}/source`,
			`${root}/published`,
			`${root}/preview`,
			`${root}/preview/job%20%23%3F%25`
		])
		for (const href of links) {
			const url = new URL(href, 'https://app.test')
			expect(url.search).toBe('')
			expect(url.hash).toBe('')
			expect(decodeURIComponent(url.pathname)).toContain(file)
		}
		expect(resolve).not.toHaveBeenCalled()
	}
)

test.each([
	'books/源 #?%&"+=.books.md',
	'folder with spaces/a book.books.md',
	'nested/literal%2F.books.md',
	'books/📚.books.md',
	'nested/name?check=0&file=other#fragment.books.md'
])('publish navigation preselects the complete raw filename %s', (file) => {
	const url = new URL(publishHref(file), 'https://app.test')
	expect(url.pathname).toBe('/admin/publish')
	expect(url.hash).toBe('')
	expect([...url.searchParams.entries()]).toEqual([
		['check', '1'],
		['file', file]
	])
	expect(resolve).not.toHaveBeenCalled()
})

test('publish navigation encodes a query value rather than a pathname', () => {
	expect(publishHref('folder/a b+c.books.md')).toBe(
		'/admin/publish?check=1&file=folder%2Fa+b%2Bc.books.md'
	)
})

test.each([
	['books/源 #?%.books.md', 'books/%E6%BA%90%20%23%3F%25.books.md'],
	['folder with spaces/a book.books.md', 'folder%20with%20spaces/a%20book.books.md'],
	['nested/literal%2F.books.md', 'nested/literal%252F.books.md'],
	['books/📚.books.md', 'books/%F0%9F%93%9A.books.md'],
	['published/page/icon/share/source/file.md', 'published/page/icon/share/source/file.md']
])('encodes raw piece path %s segment-wise without a request store', (file, encoded) => {
	expect(encodeArchivePath(file)).toBe(encoded)
	expect(resolve).not.toHaveBeenCalled()
})
