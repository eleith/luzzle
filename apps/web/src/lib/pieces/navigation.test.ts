import { expect, test, vi } from 'vitest'
import { editorHref, getPieceLinks, previewHref, publishedHref } from './navigation'

const { resolve } = vi.hoisted(() => ({
	resolve: vi.fn(() => {
		throw new Error('Could not get the request store. This is an internal error.')
	})
}))
vi.mock('$app/paths', () => ({ resolve }))

const piecePath = 'books/%E6%BA%90%20%23%3F%25%26%22.books.md'
const route = '/admin/piece/[...path]/published'

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

test.each(
	['', '/garden'].flatMap((mount) =>
		['', '/page', '/icon', '/share'].map((suffix) => ({ mount, suffix }))
	)
)(
	'builds all five links for mount=$mount view=$suffix without a request store',
	({ mount, suffix }) => {
		const root = `${mount}/admin/piece/${piecePath}`
		const url = new URL(`https://app.test${root}/published${suffix}?private=query#fragment`)
		const before = url.href
		const links = getPieceLinks(url, route + suffix)
		expect(links).toEqual({
			source: `${root}/source`,
			overview: `${root}/published`,
			page: `${root}/published/page`,
			icon: `${root}/published/icon`,
			share: `${root}/published/share`
		})
		expect(JSON.parse(JSON.stringify(links))).toEqual(links)
		expect(url.href).toBe(before)
		expect(resolve).not.toHaveBeenCalled()
	}
)

test.each(['', '/page', '/icon', '/share'])(
	'trailing slash on %s does not change piece identity',
	(suffix) => {
		const url = new URL(
			`https://app.test/admin/piece/films/mars-express.films.md/published${suffix}/`
		)
		expect(getPieceLinks(url, route + suffix).overview).toBe(
			'/admin/piece/films/mars-express.films.md/published'
		)
	}
)

test('already-encoded literal percent filenames are preserved, not encoded twice or decoded', () => {
	const url = new URL('https://app.test/admin/piece/nested/cover%2520name.md/published')
	expect(getPieceLinks(url, route).source).toBe('/admin/piece/nested/cover%2520name.md/source')
})

test('nested source folders named after view routes remain part of source identity', () => {
	const url = new URL(
		'https://app.test/garden/admin/piece/published/page/icon/share/file.md/published/share'
	)
	expect(getPieceLinks(url, route + '/share').source).toBe(
		'/garden/admin/piece/published/page/icon/share/file.md/source'
	)
})

test('encoded static route segments stay navigable under the matched route identity', () => {
	const url = new URL('https://app.test/%61dmin/piece/books/book.md/published/icon')
	expect(getPieceLinks(url, route + '/icon').source).toBe('/%61dmin/piece/books/book.md/source')
})
