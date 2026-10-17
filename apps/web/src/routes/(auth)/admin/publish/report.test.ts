import { expect, test } from 'vitest'
import { getRunKind, editorHref, publishedHref, latestPhases } from './report.js'

test('the actual workflow overrides the action used to attach to an existing run', () => {
	expect(getRunKind('Publish', 'audit')).toBe('publish')
	expect(getRunKind('PublishAudit', 'publish')).toBe('audit')
	expect(getRunKind('Publish', null)).toBe('publish')
})

test('legacy stream frames without workflow metadata retain their existing kind', () => {
	expect(getRunKind(undefined, 'audit')).toBe('audit')
	expect(getRunKind('unknown', 'publish')).toBe('publish')
})

test('retry attempts collapse to the latest state per phase without changing phase order', () => {
	const first = { phase: 'assets.generate', status: 'completed' }
	const failed = { phase: 'cdn.sync', status: 'failed' }
	const retry = { phase: 'cdn.sync', status: 'completed' }
	const cache = { phase: 'cache.purge', status: 'completed' }
	const rows = [first, failed, retry, cache]
	expect(latestPhases(rows)).toEqual([first, retry, cache])
	expect(rows).toEqual([first, failed, retry, cache])
	expect(latestPhases([])).toEqual([])
})

test.each([
	'books/chapter#1.book.md',
	'books/name?query%.book.md',
	'folder with spaces/a book.book.md',
	'books/源 📖.book.md'
])('piece links preserve valid special filename characters: %s', (file) => {
	const encoded = file.split('/').map(encodeURIComponent).join('/')
	expect(editorHref(file)).toBe(`/admin/piece/${encoded}/source`)
	expect(publishedHref(file)).toBe(`/admin/piece/${encoded}/published`)
	for (const href of [editorHref(file), publishedHref(file)]) {
		const url = new URL(href, 'http://localhost')
		expect(url.search).toBe('')
		expect(url.hash).toBe('')
		expect(decodeURIComponent(url.pathname)).toContain(file)
	}
})
