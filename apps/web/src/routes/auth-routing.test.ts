import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

function routeFiles(directory: string, prefix = ''): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = `${prefix}${entry.name}`
		if (entry.isDirectory()) return routeFiles(join(directory, entry.name), `${path}/`)
		return entry.isFile() ? [path] : []
	})
}

const files = routeFiles(fileURLToPath(new URL('.', import.meta.url)))
const routeIds = [
	...new Set(
		files
			.filter((file) =>
				/(?:^|\/)\+(?:page(?:\.server)?\.[jt]s|page(?:@[^.]*)?\.svelte|server\.[jt]s)$/.test(file)
			)
			.map((file) => `/${file.split('/').slice(0, -1).join('/')}`)
	)
]

function publicPath(routeId: string): string {
	return (
		routeId
			.split('/')
			.filter((segment) => !/^\([^)]*\)$/.test(segment))
			.join('/') || '/'
	)
}

test('all admin page and server entrypoints live under the top-level auth group', () => {
	const adminRoutes = routeIds.filter((id) => /^\/(?:api\/)?admin(?:\/|$)/.test(publicPath(id)))

	expect(adminRoutes.length).toBeGreaterThan(0)
	expect(adminRoutes.filter((id) => !id.startsWith('/(auth)/'))).toEqual([])
})

test.each([
	'/admin',
	'/admin/piece/[...path]/source',
	'/admin/view/published/[...path]',
	'/admin/piece/[...path]/preview',
	'/admin/view/preview/[jobId]',
	'/admin/open/[piece]/[slug]',
	'/api/admin/generate',
	'/api/admin/publication-status',
	'/api/admin/jobs/publish',
	'/api/admin/jobs/publish-audit',
	'/api/admin/jobs/unpublish',
	'/api/admin/jobs/refresh-index',
	'/api/admin/jobs/[id]/stream'
])('%s has an auth-grouped route ID without changing its public path', (path) => {
	const ids = routeIds.filter((id) => publicPath(id) === path)
	expect(ids).toEqual([`/(auth)${path}`])
})

test.each(['view/published/[...path]', 'view/preview', 'piece/[...path]/preview'])(
	'%s reset layout remains under the auth group',
	(path) => {
		expect(files).toContain(`(auth)/admin/${path}/+layout@.svelte`)
	}
)

test.each([
	['/', '/(root)'],
	['/signin', '/signin'],
	['/pieces/[[piece]]', '/pieces/[[piece]]'],
	['/rss/pieces/[[piece]]/feed.html', '/rss/pieces/[[piece]]/feed.html'],
	[
		'/rss/pieces/[[piece]]/feed.[format=feedFormat]',
		'/rss/pieces/[[piece]]/feed.[format=feedFormat]'
	],
	['/search', '/search'],
	['/tags/[tag]', '/tags/[tag]'],
	['/api/health', '/api/health'],
	['/api/pieces', '/api/pieces'],
	['/api/search', '/api/search'],
	['/api/session/verify', '/api/session/verify']
])('%s stays outside the auth group', (path, id) => {
	expect(routeIds.filter((routeId) => publicPath(routeId) === path)).toEqual([id])
})
