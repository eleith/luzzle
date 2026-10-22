import { beforeEach, expect, test, vi } from 'vitest'
import { createRawSnippet, type ComponentProps } from 'svelte'
import { render } from 'svelte/server'
import { makeConfig } from '$lib/server/config.fixture'
import { publishedPiece, asset } from '$lib/pieces/viewer/fixtures/published'
import Overview from './+page.svelte'
import PreviewLayout from './+layout.svelte'

const { page, resolve } = vi.hoisted(() => ({
	page: { url: new URL('https://app.test/admin/piece/books/book.md/preview/job') },
	resolve: vi.fn(() => {
		throw new Error('Could not get the request store. This is an internal error.')
	})
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/paths', () => ({ resolve }))

type Data = ComponentProps<typeof Overview>['data']
type Status = 'waiting' | 'running' | 'completed' | 'failed' | 'expired'
function data(status: Status = 'completed'): Data {
	const common = {
		pieceTypes: ['books'],
		config: makeConfig({
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
		finishedAt:
			status === 'completed' || status === 'failed' || status === 'expired'
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
				message: 'Preview log <script>escaped()</script>'
			}
		]
	}
	if (status === 'failed') return { ...common, status, errorMessage: 'Preview failed fixture' }
	if (status !== 'completed') return { ...common, status }
	const outputs = [
		asset('image.original', 'generated/cover.jpg', 'image'),
		asset('image.s.webp', 'generated/s.webp', 'image', 'image/webp'),
		{
			...asset('markdown', 'generated/body.html', 'piece', 'text/html'),
			content: '<script>privateBody()</script><h1>Body</h1>'
		},
		{
			...asset('markdown.description', null, 'piece', 'text/html'),
			content: '<p>privateDescription()</p>'
		},
		{
			...asset('palette', null, 'piece', 'application/json'),
			content: '{"color":"#abc","count":42}'
		},
		asset('custom.invalid', '../private.pdf', 'piece', 'application/pdf'),
		asset('custom.missing', null, 'piece', 'application/pdf')
	]
	return {
		...common,
		status,
		outputs,
		piece: {
			...publishedPiece,
			title: 'Preview <Draft>',
			assets: [...outputs, asset('attachment', 'archive/manual.pdf')]
		},
		tags: []
	}
}

function tree(props: Data) {
	const children = createRawSnippet(() => ({
		render: () =>
			render(Overview, { props: { data: props, params: { path: props.file, jobId: props.job } } })
				.body
	}))
	return render(PreviewLayout, {
		props: { data: props, params: { path: props.file, jobId: props.job }, children }
	}).body.replace(/<!--[^]*?-->/g, '')
}

beforeEach(() => {
	page.url = new URL('https://app.test/admin/piece/books/book.md/preview/job')
	vi.clearAllMocks()
})

test('completed Preview reads title, consolidated facts, Preview logs, then assets with a single main/title', () => {
	const html = tree(data())
	expect(html.match(/<main\b/g)).toHaveLength(1)
	expect(html.match(/<h1\b/g)).toHaveLength(1)
	expect(html).toContain('Preview &lt;Draft>')
	expect(html).toContain('Preview assets</h2>')
	expect(html).toContain('Preview logs</h2>')
	expect(html).toContain('Preview log &lt;script>escaped()&lt;/script>')
	expect(html.indexOf('Preview &lt;Draft>')).toBeLessThan(html.indexOf('Preview</caption>'))
	expect(html.indexOf('Preview</caption>')).toBeLessThan(html.indexOf('Preview logs</h2>'))
	expect(html.indexOf('Preview logs</h2>')).toBeLessThan(html.indexOf('Preview assets</h2>'))
	const facts = html.slice(html.indexOf('<caption'), html.indexOf('</table>'))
	const logSection = html.slice(
		html.indexOf('Preview logs</h2>'),
		html.indexOf('Preview assets</h2>')
	)
	expect(facts).toContain('books/book.md</bdi>')
	expect(facts).toContain('data-status="completed"')
	expect(facts).toContain('>Completed</span>')
	expect(facts).toContain('1s total time')
	expect(facts).not.toContain('<svg')
	expect(logSection).not.toContain('books/book.md')
	expect(logSection).not.toContain('Preview completed')
	expect(logSection).not.toContain('total time')
	expect(html).not.toContain('status-card')
	expect(html.indexOf('Preview logs</h2>')).toBeLessThan(html.indexOf('Preview log &lt;script>'))
	expect(html).toContain('datetime="1970-01-01T00:00:00.000Z"')
	expect(html).toContain('datetime="1970-01-01T00:00:02.000Z"')
	for (const caption of ['Preview', 'Image', 'Markdown', 'Palette', 'Custom'])
		expect(html).toContain(`${caption}</caption>`)
	expect(html.match(/Image<\/caption>/g)).toHaveLength(1)
	expect(html.match(/Markdown<\/caption>/g)).toHaveLength(1)
	for (const output of ['image.original', 'image.s.webp', 'markdown.description'])
		expect(html).toContain(`${output}</bdi>`)
	for (const path of ['generated/cover.jpg', 'generated/s.webp', 'generated/body.html'])
		expect(html).toContain(`href="/admin/preview/job/asset/${path}"`)
	expect(html).not.toMatch(/ download(?:[= >])/)
	expect(html).toContain('aria-label="Show Markdown: Asset 2, Content"')
	expect(html).toContain('aria-label="Show Markdown.description: Asset 2, Content"')
	expect(html).toContain('aria-label="Show Palette: Asset 2, Content"')
	expect(html).toContain('aria-expanded="false"')
	expect(html).not.toContain('{"color":"#abc","count":42}')
	expect(html).not.toContain('color</bdi>')
	expect(html).not.toContain('count</bdi>')
	expect(html).toContain('Unavailable</small>')
	expect(html).toContain('Not recorded')
	for (const absent of [
		'privateBody()',
		'privateDescription()',
		'<script>',
		'<iframe',
		'archive/manual.pdf',
		'Attachment</caption>',
		'Last publish',
		'Publication</caption>',
		'Matches publish',
		'https://public.test',
		'https://cdn.test',
		'/pieces/assets/',
		'/admin/asset/',
		'background-color: #abc'
	])
		expect(html).not.toContain(absent)
	expect(resolve).not.toHaveBeenCalled()
})

test.each(['waiting', 'running', 'failed', 'expired'] as const)(
	'%s Preview puts current facts above logs without inventing assets or publication facts',
	(status) => {
		const props = data(status)
		const html = tree(props)
		expect(html.match(/<main\b/g)).toHaveLength(1)
		expect(html).toContain('Piece overview')
		expect(html).toContain('Preview</caption>')
		expect(html).toContain('Preview logs</h2>')
		const label = {
			waiting: 'Queued',
			running: 'Building',
			failed: 'Failed',
			expired: 'Expired'
		}[status]
		expect(html).toContain(`>${label}</span>`)
		expect(html).toContain('datetime="1970-01-01T00:00:00.000Z"')
		if (status === 'waiting' || status === 'running')
			expect(html).not.toContain('datetime="1970-01-01T00:00:02.000Z"')
		expect(html.indexOf('Preview</caption>')).toBeLessThan(html.indexOf('Preview logs</h2>'))
		expect(html).not.toContain('Preview assets')
		expect(html).not.toContain('Preview outputs')
		expect(html).not.toContain('Publication</caption>')
		expect(html).not.toContain('Preview &lt;Draft>')
		expect(html).not.toContain('/asset/generated/')
		expect(resolve).not.toHaveBeenCalled()
	}
)

test('completed workflow without an assembled result keeps facts/logs and omits assets rather than crashing', () => {
	const running = data('running')
	if (running.status !== 'running') throw new Error('Expected running fixture')
	const props = { ...running, status: 'completed' as const }
	const html = tree(props)
	expect(html.match(/<main\b/g)).toHaveLength(1)
	expect(html.match(/<h1\b/g)).toHaveLength(1)
	expect(html).toContain('Preview</h1>')
	expect(html).toContain('Preview</caption>')
	expect(html).toContain('>Completed</span>')
	expect(html).toContain('Preview logs</h2>')
	expect(html).toContain('Preview log &lt;script>escaped()&lt;/script>')
	expect(html.indexOf('Preview</caption>')).toBeLessThan(html.indexOf('Preview logs</h2>'))
	expect(html).not.toContain('Preview assets')
	expect(html).not.toContain('None recorded')
	expect(html).not.toContain('/asset/generated/')
	expect(resolve).not.toHaveBeenCalled()
})

test('recorded generated Share PNG remains a View link in Overview', () => {
	const props = data()
	if (props.status !== 'completed' || !props.outputs) throw new Error('Expected assembled fixture')
	props.outputs = [
		...props.outputs,
		asset('opengraph', 'generated/share.png', 'piece', 'image/png')
	]
	const html = tree(props)
	const png = html
		.match(/<a\b[^>]*>/g)
		?.find((tag) => tag.includes('href="/admin/preview/job/asset/generated/share.png"'))
	expect(png).toBeDefined()
	expect(png).toContain('aria-label="View opengraph: generated/share.png"')
	expect(png).toContain('target="_blank"')
	expect(png).toContain('rel="noopener noreferrer"')
	expect(png).not.toMatch(/\bdownload(?:=|\s|>)/)
	expect(html.match(/<main\b/g)).toHaveLength(1)
	expect(resolve).not.toHaveBeenCalled()
})

test('empty generated outputs do not turn SDK passthroughs into downloadable preview artifacts', () => {
	const props = data()
	if (props.status !== 'completed') throw new Error('Expected completed fixture')
	props.outputs = []
	const html = tree(props)
	expect(html).toContain('Preview assets</h2>')
	expect(html).toContain('None recorded')
	expect(html).not.toContain('Image</caption>')
	expect(html).not.toContain('archive/manual.pdf')
	expect(html).not.toContain('/asset/generated/')
})

test('replacement completed snapshots use only the new job namespace and metadata without a request store', () => {
	tree(data())
	const props = data()
	if (props.status !== 'completed' || !props.piece) throw new Error('Expected assembled fixture')
	props.job = 'new-job'
	props.piece = { ...props.piece, title: 'New result' }
	props.outputs = [asset('custom', 'new.txt', 'new', 'text/plain')]
	page.url = new URL('https://app.test/admin/piece/books/book.md/preview/new-job')
	const html = tree(props)
	expect(html).toContain('New result')
	expect(html).toContain('href="/admin/preview/new-job/asset/new.txt"')
	expect(html).not.toContain('/preview/job/asset/')
	expect(html).not.toContain('generated/cover.jpg')
	expect(resolve).not.toHaveBeenCalled()
})
