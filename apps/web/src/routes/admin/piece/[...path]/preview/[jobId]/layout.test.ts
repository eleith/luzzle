import { existsSync, readFileSync } from 'node:fs'
import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import { createRawSnippet, type ComponentProps } from 'svelte'
import { render } from 'svelte/server'
import { makeConfig } from '$lib/server/config.fixture'
import { publishedPiece } from '$lib/pieces/viewer/fixtures/published'
import PreviewLayout from './+layout.svelte'
import PreviewResetLayout from '../+layout@.svelte'

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

test('Share HTML label keeps the renamed alternate destination available and solely active', () => {
	page.url = new URL(`${root}/share?html`, 'https://app.test')
	const links = anchors(body())
	expect(links).toHaveLength(6)
	expect(links.filter((link) => link.includes('aria-current="page"'))).toHaveLength(1)
	expect(links.at(-1)).toContain(`href="${root}/share?html"`)
	expect(links.at(-1)).toContain('share (html)')
	expect(links[4]).toMatch(/>\s*share\s*<\/a>/)
	expect(links.at(-1)).not.toContain('og (html)')
	expect(links.at(-1)).toContain('aria-current="page"')
	expect(links[4]).not.toContain('aria-current="page"')
	expect(EventSource).not.toHaveBeenCalled()
})
