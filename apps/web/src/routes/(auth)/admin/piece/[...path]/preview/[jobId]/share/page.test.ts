import { beforeEach, expect, test, vi } from 'vitest'
import { createRawSnippet, type ComponentProps } from 'svelte'
import { render } from 'svelte/server'
import { makePublicConfig } from '#lib/server/config.fixture.js'
import {
	publishedPiece as rawPublishedPiece,
	asset
} from '#lib/pieces/viewer/fixtures/published.js'
import PreviewLayout from '../+layout.svelte'
import Page from '../page/+page.svelte'
import Icon from '../icon/+page.svelte'
import SharePage from './+page.svelte'

const publishedPiece = {
	...rawPublishedPiece,
	templates: {
		icon: { name: 'default', fields: { image: 'cover' } },
		page: { name: 'default', fields: { image: 'cover' } },
		opengraph: { name: 'default', fields: { image: 'cover' } }
	}
}

const { page, resolve } = vi.hoisted(() => ({
	page: {
		url: new URL('https://app.test/admin/piece/books/book.md/preview/job/share'),
		route: { id: '/(auth)/admin/piece/[...path]/preview/[jobId]/share' },
		data: {
			preview: true,
			job: 'job',
			config: { url: { app: 'https://public.test/site', luzzle_assets: 'https://cdn.test' } }
		}
	},
	resolve: vi.fn((route: string, params: { tag: string } | { path: string; jobId?: string }) => {
		if (route === '/tags/[tag]' && 'tag' in params) return `/tags/${params.tag}`
		if (!('path' in params)) throw new Error(`Unexpected route: ${route}`)
		return route
			.replace('/(auth)', '')
			.replace('[...path]', () => params.path)
			.replace('[jobId]', () => params.jobId ?? '')
	})
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/paths', () => ({ resolve }))

// Only the layout's five destinations and explicit page tag links may use this mock.
// Resource/helper URLs must remain independent; this is not native Kit resolution evidence.
function expectAppNavigation(jobs = ['job'], tags: string[] = []) {
	expect(resolve.mock.calls).toEqual([
		...jobs.flatMap((job) => {
			const route = '/(auth)/admin/piece/[...path]/preview/[jobId]'
			const path = 'books/book.md'
			const jobId = encodeURIComponent(job)
			return [
				['/(auth)/admin/piece/[...path]/source', { path }],
				[route, { path, jobId }],
				[`${route}/page`, { path, jobId }],
				[`${route}/icon`, { path, jobId }],
				[`${route}/share`, { path, jobId }]
			]
		}),
		...tags.map((tag) => ['/tags/[tag]', { tag: encodeURIComponent(tag) }])
	])
}
// Only renderer wrappers are replaced: the real routes, layout, ShareViewport
// and getPieceHelpers run. SSR cannot prove reactive prop updates, client SSE,
// or instance ResizeObserver mounting/cleanup and responsive scaling behavior.
vi.mock('#lib/pieces/components/opengraph.svelte', async () => ({
	default: (await import('#lib/pieces/viewer/fixtures/Composition.svelte')).default
}))
vi.mock('#lib/pieces/components/page.svelte', async () => ({
	default: (await import('#lib/pieces/viewer/fixtures/PageRenderer.svelte')).default
}))
vi.mock('#lib/pieces/components/icon.svelte', async () => ({
	default: (await import('#lib/pieces/viewer/fixtures/IconRenderer.svelte')).default
}))

type Data = ComponentProps<typeof SharePage>['data']
type Status = 'waiting' | 'running' | 'completed' | 'failed' | 'expired'
function data(status: Status = 'completed', png = true): Data {
	const common = {
		pieceTypes: ['books'],
		config: makePublicConfig({
			url: {
				app: 'https://public.test/site',
				app_assets: '/static',
				luzzle_assets: 'https://cdn.test/published'
			}
		}),
		meta: { title: 'Garden', description: 'Description' },
		preview: true as const,
		file: 'books/book.md',
		job: 'job',
		createdAt: '1970-01-01T00:00:00.000Z',
		finishedAt: ['completed', 'failed', 'expired'].includes(status)
			? '1970-01-01T00:00:02.000Z'
			: null,
		phases: [
			{
				job_id: 'job',
				phase: 'transform',
				status: 'completed',
				started_at: 1000,
				finished_at: 2000,
				message: null
			}
		],
		logs: [
			{
				job_id: 'job',
				phase: 'transform',
				line_number: 1,
				ts: 1000,
				level: 'info',
				message: 'Preview log <draft>'
			}
		]
	}
	if (status === 'failed') return { ...common, status, errorMessage: 'Preview failed fixture' }
	if (status !== 'completed') return { ...common, status }
	const outputs = [
		asset('image.original', 'generated/cover.jpg', 'cover'),
		...(png ? [asset('opengraph', 'generated/share.png', 'piece', 'image/png')] : [])
	]
	return {
		...common,
		status,
		outputs,
		tags: [],
		piece: { ...publishedPiece, title: 'Preview <Draft>', assets: outputs }
	}
}

const routes = { share: SharePage, page: Page, icon: Icon }
function tree(props: Data, view: keyof typeof routes = 'share', query = '') {
	page.data = props
	page.url = new URL(
		`https://app.test/admin/piece/${props.file}/preview/${props.job}/${view}${query}`
	)
	page.route.id = `/(auth)/admin/piece/[...path]/preview/[jobId]/${view}`
	const params = { path: props.file, jobId: props.job }
	const children = createRawSnippet(() => ({
		render: () => render(routes[view], { props: { data: props, params } }).body
	}))
	return render(PreviewLayout, { props: { data: props, params, children } }).body.replace(
		/<!--[^]*?-->/g,
		''
	)
}

beforeEach(() => vi.clearAllMocks())

test.each([true, false])('Share reconstructs composition with recorded PNG=%s', (png) => {
	const html = tree(data('completed', png))
	expect(html).toContain('aria-label="Share"')
	expect(html).toContain('data-renderer="composition"')
	expect(html).toContain('Preview &lt;Draft>')
	expect(html).toContain('src="/admin/preview/job/asset/generated/cover.jpg"')
	expect(html.match(/<img\b/g)).toHaveLength(1)
	expect(html.match(/<main\b/g)).toHaveLength(1)
	expect(html).toContain('id="main-content"')
	expect(html).not.toMatch(
		/generated\/share\.png|not (?:been )?generated|Open generated share image|share \(html\)|<button/i
	)
	expect(html).not.toMatch(
		/https:\/\/(?:public|cdn)\.test|\/pieces\/assets\/|\/admin\/asset\/|published\/cover\.jpg/
	)
	expectAppNavigation()
})

test('?html is ignored: identical composition and four tabs plus Back, only Share active', () => {
	const props = data()
	const html = tree(props)
	expect(tree(props, 'share', '?html')).toBe(html)
	const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'))
	expect(header.match(/<a\b/g)).toHaveLength(5)
	expect(header.match(/aria-current="page"/g)).toHaveLength(1)
	expect(header).toContain('aria-label="Back to editor"')
	for (const view of ['overview', 'page', 'icon', 'share'])
		expect(header).toMatch(new RegExp(`>\\s*${view}\\s*</a>`))
	expect(header).toMatch(/<a[^>]*href="[^"]*\/share"[^>]*aria-current="page"[^>]*>\s*share\s*<\/a>/)
	expect(header).not.toContain('?html')
	expect(header).not.toContain('share (html)')
	expectAppNavigation(['job', 'job'])
})

test.each(['share', 'page', 'icon'] as const)(
	'completed %s owns exactly one main inside the real layout',
	(view) => {
		const html = tree(data(), view)
		expect(html.match(/<main\b/g)).toHaveLength(1)
		expect(html.match(/id="main-content"/g)).toHaveLength(1)
		expect(html).toContain(`data-renderer="${view === 'share' ? 'composition' : view}"`)
		expect(html).toContain('src="/admin/preview/job/asset/generated/cover.jpg"')
		expectAppNavigation()
	}
)

test.each(['waiting', 'running', 'failed', 'expired'] as const)(
	'%s Share keeps facts and logs under the layout main, not composition or PNG UI',
	(status) => {
		const html = tree(data(status))
		expect(html.match(/<main\b/g)).toHaveLength(1)
		expect(html).toContain('id="main-content"')
		expect(html).toContain('Preview</caption>')
		expect(html).toContain('books/book.md</bdi>')
		expect(html).toContain('Preview logs</h2>')
		expect(html).toContain('Preview log &lt;draft>')
		expect(html.indexOf('Preview</caption>')).toBeLessThan(html.indexOf('Preview logs</h2>'))
		expect(html).not.toMatch(
			/data-renderer="composition"|<img|generated\/share\.png|Open generated share image|\?html|Preview assets/
		)
		expectAppNavigation()
	}
)

test('completed without an assembled piece is safe and invents no composition or artifacts', () => {
	const pending = data('running')
	if (pending.status !== 'running') throw new Error('Expected running fixture')
	const html = tree({ ...pending, status: 'completed' })
	expect(html).toContain('Back to editor')
	expect(html).not.toMatch(
		/data-renderer=|<img|\/asset\/|Open generated share image|not (?:been )?generated/i
	)
	expectAppNavigation()
})

test('completed Page resolves tag navigation but never preview resources', () => {
	const props = data()
	if (props.status !== 'completed') throw new Error('Expected completed fixture')
	props.tags = [{ slug: '源 #?%', tag: 'Tag <label>' }]
	const html = tree(props, 'page')
	expect(html).toContain('href="/tags/%E6%BA%90%20%23%3F%25"')
	expect(html).toContain('Tag &lt;label>')
	expect(html).toContain('src="/admin/preview/job/asset/generated/cover.jpg"')
	expectAppNavigation(['job'], ['源 #?%'])
})
