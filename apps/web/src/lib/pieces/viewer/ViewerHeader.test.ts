import { expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import ViewerHeader from './ViewerHeader.svelte'

const { page } = vi.hoisted(() => ({
	page: { route: { id: '/(auth)/admin/piece/[...path]/published' } }
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/paths', () => ({
	resolve: (route: string, params: { path: string }) =>
		route.replace('/(auth)', '').replace('[...path]', () => params.path)
}))

const file = 'notes/icon/雪 #?%.books.md'
const root = '/admin/piece/notes/icon/%E9%9B%AA%20%23%3F%25.books.md'
const publishedRoute = '/(auth)/admin/piece/[...path]/published'

test('all views and the editor link refer to the current archive file', () => {
	const destinations = [
		'source',
		'published',
		'published/page',
		'published/icon',
		'published/share'
	]

	const html = render(ViewerHeader, { props: { file } }).body

	for (const destination of destinations) {
		expect(html).toContain(`href="${root}/${destination}"`)
	}
	expect(html).toContain('aria-label="Back to editor"')
})

test.each([
	{ view: 'overview', suffix: '' },
	{ view: 'page', suffix: '/page' },
	{ view: 'icon', suffix: '/icon' },
	{ view: 'share', suffix: '/share' }
])('marks only the current $view tab as active', ({ suffix }) => {
	page.route.id = publishedRoute + suffix

	const html = render(ViewerHeader, { props: { file } }).body

	const activeLinks = html.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? []
	expect(activeLinks).toHaveLength(1)
	expect(activeLinks[0]).toContain(`href="${root}/published${suffix}"`)
})
