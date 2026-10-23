import { existsSync, readFileSync } from 'node:fs'
import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import { createRawSnippet, type ComponentProps } from 'svelte'
import { render } from 'svelte/server'
import { parse } from 'svelte/compiler'
import { makeConfig } from '$lib/server/config.fixture'
import { publishedPiece as rawPublishedPiece } from '$lib/pieces/viewer/fixtures/published'
import PreviewLayout from './+layout.svelte'
import PreviewResetLayout from '../+layout@.svelte'

const publishedPiece = {
	...rawPublishedPiece,
	templates: {
		icon: { name: 'default', fields: { image: 'cover' } },
		page: { name: 'default', fields: { image: 'cover' } },
		opengraph: { name: 'default', fields: { image: 'cover' } }
	}
}

const { page, EventSource } = vi.hoisted(() => ({
	page: { url: new URL('https://app.test/') },
	EventSource: vi.fn()
}))
vi.mock('$app/state', () => ({ page }))

const file = 'books/book.books.md'
const root = `/admin/piece/${file}/preview/preview-id`
const children = createRawSnippet(() => ({ render: () => '<p>Preview child fixture</p>' }))
type Status = 'waiting' | 'running' | 'completed' | 'failed' | 'expired'

function data(status: Status): ComponentProps<typeof PreviewLayout>['data'] {
	const common = {
		pieceTypes: ['books'],
		config: makeConfig(),
		meta: { title: 'Garden', description: 'Description' },
		preview: true as const,
		file,
		job: 'preview-id',
		createdAt: '2026-06-20T00:00:00Z',
		finishedAt:
			status === 'completed' || status === 'failed' || status === 'expired'
				? '2026-06-21T00:00:00Z'
				: null,
		phases: [],
		logs: []
	}
	if (status === 'completed')
		return { ...common, status, piece: publishedPiece, tags: [], outputs: publishedPiece.assets }
	if (status === 'failed') return { ...common, status, errorMessage: 'Preview failed fixture' }
	return { ...common, status }
}

function body(status: Status = 'completed') {
	return render(PreviewLayout, {
		props: { data: data(status), params: { path: file, jobId: 'preview-id' }, children }
	}).body.replace(/<!--[^]*?-->/g, '')
}

function anchors(html: string) {
	return html.match(/<a\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/a>/g) ?? []
}

beforeEach(() => {
	page.url = new URL(root, 'https://app.test')
	vi.clearAllMocks()
	vi.stubGlobal('EventSource', EventSource)
})
afterEach(() => vi.unstubAllGlobals())

test.each(['/static', 'https://cdn.test/site-assets', ''])(
	'Preview reset layout adds only the configured site favicon for base %j in every job state',
	(base) => {
		for (const status of ['waiting', 'running', 'completed', 'failed', 'expired'] as const) {
			const props = data(status)
			props.config.url.app_assets = base
			const result = render(PreviewResetLayout, {
				props: { data: props, params: { path: file }, children }
			})
			expect(result.head).toContain(`rel="icon" href="${base}/images/favicon.png"`)
			expect(result.head.match(/rel="icon"/g)).toHaveLength(1)
			expect(result.head).not.toContain('<title>')
			expect(result.head).not.toContain('property="og:')
			expect(result.head).not.toContain('name="description"')
			expect(result.head).not.toContain('name="robots"')
			expect(result.body).toContain('Preview child fixture')
			expect(EventSource).not.toHaveBeenCalled()
		}
	}
)

// Structural guard for the remount boundary; SSR cannot exercise client replacement or SSE cleanup.
test('Preview keys the entire job layout subtree by job, not the current tab', () => {
	const source = readFileSync(new URL('../+layout@.svelte', import.meta.url), 'utf8')
	const nodes = parse(source, { modern: true }).fragment.nodes.filter(
		(node) => node.type !== 'Text' && node.type !== 'SvelteHead'
	)
	expect(nodes).toHaveLength(1)
	const boundary = nodes[0]
	if (boundary.type !== 'KeyBlock')
		throw new Error('Preview children must be inside the identity key')
	expect(boundary.expression).toMatchObject({
		type: 'MemberExpression',
		object: { type: 'Identifier', name: 'params' },
		property: { type: 'Identifier', name: 'jobId' }
	})
	expect(boundary.fragment.nodes.filter((node) => node.type !== 'Text')).toMatchObject([
		{ type: 'RenderTag', expression: { callee: { type: 'Identifier', name: 'children' } } }
	])
})

test('Preview consumes the shared viewer bar instead of keeping separate banner styles', () => {
	const source = readFileSync(new URL('./+layout.svelte', import.meta.url), 'utf8')
	expect(source).toContain("ViewerBar.css'")
	expect(source).toContain("'virtual:icons/ph/arrow-left'")
	for (const name of [
		'viewer-bar',
		'viewer-bar-back',
		'viewer-bar-links',
		'viewer-bar-link',
		'viewer-bar-label'
	])
		expect(source).toContain(`class="${name}`)
	expect(source).not.toContain('.preview-banner {')
})

test('Preview registers Share without retaining an OG route or redirect alias', () => {
	expect(existsSync(new URL('./share/+page.svelte', import.meta.url))).toBe(true)
	expect(existsSync(new URL('./og/', import.meta.url))).toBe(false)
})

// SSR establishes markup/state contracts, not mount/SSE, CSS layout or client replacement.
test.each(['waiting', 'running', 'completed', 'failed', 'expired'] as const)(
	'Preview %s retains destinations and availability inside the shared responsive header',
	(status) => {
		const html = body(status)
		const header = html.slice(0, html.indexOf('</header>') + '</header>'.length)
		const links = anchors(header)
		expect(links).toHaveLength(5)
		expect(header).toContain('class="viewer-bar"')
		expect(header).toContain('class="viewer-bar-links" aria-label="Preview views"')
		expect(header).toContain('class="viewer-bar-label">preview</span>')
		expect(links[0]).toContain(`href="/admin/piece/${file}/source"`)
		expect(links[0]).toContain('aria-label="Back to editor"')
		expect(links[0]).toContain('title="Back to editor"')
		expect(links[0]).toMatch(/<svg\b[^>]*aria-hidden="true"/)
		expect(links[0]).toMatch(/<svg\b[^>]*focusable="false"/)
		expect(links[1]).toContain(`href="${root}"`)
		expect(links[1]).toContain('aria-current="page"')
		expect(links[1]).toContain('>overview</a>')
		expect(header).not.toContain('>logs</a>')
		expect(header).not.toContain(`${root}/og`)
		expect(links[1]).not.toContain('aria-disabled="true"')
		for (const [index, leaf] of ['page', 'icon', 'share'].entries()) {
			expect(links[index + 2]).toContain(
				`href="${status === 'completed' ? `${root}/${leaf}` : '#'}"`
			)
			expect(links[index + 2]).toContain(`aria-disabled="${status !== 'completed'}"`)
			expect(
				links[index + 2]
					.match(/class="([^"]*)"/)?.[1]
					.split(/\s+/)
					.includes('disabled')
			).toBe(status !== 'completed')
		}
		expect(header.match(/aria-current="page"/g)).toHaveLength(1)
		expect(links[4]).toMatch(/>\s*share\s*<\/a>/)
		expect(header).not.toMatch(/>\s*og(?: \(html\))?\s*<\/a>/)
		expect(header).not.toContain('share (html)')
		expect(html.includes('Preview child fixture')).toBe(status === 'completed')
		expect(EventSource).not.toHaveBeenCalled()
	}
)

test.each(['', '/page', '/icon', '/share'])(
	'completed Preview %s uses the existing active-view conditions with native current-page semantics',
	(leaf) => {
		page.url = new URL(root + leaf, 'https://app.test')
		const links = anchors(body())
		const selected = links.filter((link) => link.includes('aria-current="page"'))
		expect(selected).toHaveLength(1)
		expect(selected[0]).toContain(`href="${root}${leaf}"`)
		expect(selected[0]).toContain('active')
		expect(EventSource).not.toHaveBeenCalled()
	}
)

test('Preview header retains encoded file and job identity reached through View', () => {
	const props = data('completed')
	props.file = 'books/源 #?%.books.md'
	props.job = 'job #?%'
	const encodedRoot = '/admin/piece/books/%E6%BA%90%20%23%3F%25.books.md'
	const preview = `${encodedRoot}/preview/job%20%23%3F%25`
	page.url = new URL(`${preview}/share?html`, 'https://app.test')
	const html = render(PreviewLayout, {
		props: { data: props, params: { path: props.file, jobId: props.job }, children }
	}).body
	const links = anchors(html.slice(0, html.indexOf('</header>')))
	expect(links[0]).toContain(`href="${encodedRoot}/source"`)
	expect(links).toHaveLength(5)
	for (const [index, leaf] of ['', '/page', '/icon', '/share'].entries())
		expect(links[index + 1]).toContain(`href="${preview}${leaf}"`)
	expect(links.filter((link) => link.includes('aria-current="page"'))).toHaveLength(1)
	expect(links.at(-1)).toContain('aria-current="page"')
	expect(EventSource).not.toHaveBeenCalled()
})

test('obsolete html query does not create a mode, extra tab or different active view', () => {
	page.url = new URL(`${root}/share?html`, 'https://app.test')
	const withQuery = body()
	const links = anchors(withQuery)
	expect(links).toHaveLength(5)
	expect(links.filter((link) => link.includes('aria-current="page"'))).toHaveLength(1)
	expect(links[4]).toContain(`href="${root}/share"`)
	expect(links[4]).toMatch(/>\s*share\s*<\/a>/)
	expect(links[4]).toContain('aria-current="page"')
	expect(withQuery).not.toContain('?html')
	expect(withQuery).not.toContain('share (html)')
	page.url = new URL(`${root}/share`, 'https://app.test')
	expect(body()).toBe(withQuery)
	expect(EventSource).not.toHaveBeenCalled()
})
