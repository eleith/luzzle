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
	'/admin/piece/[...path]/published',
	'/admin/piece/[...path]/preview',
	'/admin/piece/[...path]/preview/[jobId]',
	'/admin/open/[piece]/[slug]',
	'/api/admin/generate',
	'/api/admin/unpublish',
	'/api/admin/publish/[id]/stream',
	'/api/admin/preview/[id]/stream'
])('%s has an auth-grouped route ID without changing its public path', (path) => {
	const ids = routeIds.filter((id) => publicPath(id) === path)
	expect(ids).toEqual([`/(auth)${path}`])
})

test.each(['published', 'preview'])('%s reset layout remains under the auth group', (view) => {
	expect(files).toContain(`(auth)/admin/piece/[...path]/${view}/+layout@.svelte`)
})

test.each([
	['/', '/(root)'],
	['/signin', '/signin'],
	['/pieces/[[piece]]', '/pieces/[[piece]]'],
	['/rss/pieces/[[piece]]/feed.html', '/rss/pieces/[[piece]]/feed.html'],
	[
		'/rss/pieces/[[piece]]/feed.[format=feedFormat]',
		'/rss/pieces/[[piece]]/feed.[format=feedFormat]'
	],
	['/pieces/[piece]/[slug]', '/pieces/[piece]/[slug]'],
	['/search', '/search'],
	['/tags/[tag]', '/tags/[tag]'],
	['/api/health', '/api/health'],
	['/api/pieces', '/api/pieces'],
	['/api/search', '/api/search'],
	['/api/session/verify', '/api/session/verify']
])('%s stays outside the auth group', (path, id) => {
	expect(routeIds.filter((routeId) => publicPath(routeId) === path)).toEqual([id])
})
