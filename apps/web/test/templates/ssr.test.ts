import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const fixture = fileURLToPath(new URL('../fixtures/templates/', import.meta.url))
const webRoot = fileURLToPath(new URL('../../', import.meta.url))
let directory: string
let configFilename: string
let childEnv: NodeJS.ProcessEnv
let buildDirectory: string
let origin: string
let server: ChildProcess | undefined
let serverErrors = ''
let originalBuild: Record<string, string>

const ogSelections = [
	{
		name: 'book',
		mapping: { image: 'artwork', author: 'filmmaker', pages: 'pageCount' },
		marker: 'book',
		text: '320 pages'
	},
	{
		name: 'poster',
		mapping: { image: 'artwork', director: 'filmmaker', runtime: 'minutes' },
		marker: 'poster',
		text: '123 min'
	},
	{
		name: 'browser-window',
		mapping: { image: 'artwork', url: 'website', author: 'filmmaker', wordCount: 'wordCount' },
		marker: 'browser-container',
		text: '3 min'
	},
	{ name: 'lined-notebook-paper', mapping: {}, marker: 'paper', text: 'Fixture description' },
	{
		name: 'recipe-card',
		mapping: {
			image: 'artwork',
			ingredients: { each: 'materials', fields: { item: 'label' } },
			prepMinutes: 'prepMinutes',
			cookMinutes: 'cookMinutes'
		},
		marker: 'notepad',
		text: '12 min'
	},
	{
		name: 'vinyl-record',
		mapping: { image: 'artwork', artist: 'filmmaker', durationSeconds: 'seconds' },
		marker: 'vinyl-container',
		text: '2:05'
	},
	{
		name: 'code-snippet',
		mapping: {
			files: { each: 'files', fields: { file: 'key', type: 'kind', format: 'language' } }
		},
		marker: 'terminal-container',
		text: '<pre data-code>let value = 1;</pre>'
	},
	{
		name: 'video-game-cartridge',
		mapping: {
			image: 'artwork',
			publisher: 'filmmaker',
			platform: 'platform',
			playTimeMinutes: 'minutes'
		},
		marker: 'cartridge-container',
		text: 'Console · 2 hrs'
	},
	{
		name: 'playing-cards',
		mapping: { backdrop: 'scenery', publisher: 'filmmaker', playTimeMinutes: 'minutes' },
		marker: 'cards-container',
		text: '123 min'
	}
]

// Isolated compiler fixture only: adapter-node6 exports the native HTTP server directly.
// Production origin/CSRF coverage lives in routes.test.ts and uses the real bootstrap.
const startServer = `
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
const { server } = await import(pathToFileURL(process.argv[1]).href);
if (!server.listening) await once(server, 'listening');
process.send({ port: server.address().port });
`

async function buildHashes() {
	const entries = await readdir(buildDirectory, { recursive: true, withFileTypes: true })
	const hashes: Record<string, string> = {}
	for (const entry of entries) {
		if (!entry.isFile()) continue
		const filename = path.join(entry.parentPath, entry.name)
		hashes[path.relative(buildDirectory, filename)] = createHash('sha256')
			.update(await readFile(filename))
			.digest('hex')
	}
	return hashes
}

async function request(route = '') {
	const response = await fetch(`${origin}/${route}`, {
		headers: { 'x-forwarded-proto': 'http' },
		signal: AbortSignal.timeout(10000)
	})
	expect(response.status).toBe(200)
	return response.text()
}

function expectNoConfiguredCss(html: string) {
	expect(html).not.toContain('%luzzle.styles%')
	expect(html).not.toContain('data-luzzle-configured-styles')
	expect(html).not.toContain('--color-primary: #123abc;')
	expect(html).not.toContain('--editor-background:')
}

function htmlHead(html: string) {
	const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
	if (head === undefined) throw new Error('Expected the fixture HTML head')
	return head
}

function htmlBody(html: string) {
	const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/)?.[1]
	if (body === undefined) throw new Error('Expected the fixture HTML body')
	return body
}

function expectInlineConfiguredCss(html: string) {
	expect(html).not.toContain('%luzzle.styles%')
	const head = htmlHead(html)
	const styles = [
		...head.matchAll(/<style\b[^>]*\bdata-luzzle-configured-styles\b[^>]*>([\s\S]*?)<\/style>/g)
	]
	expect(styles).toHaveLength(1)
	const [style, css] = styles[0]
	const charset = head.match(/<meta\b[^>]*\bcharset\b[^>]*>/i)
	if (!charset) throw new Error('Expected the fixture charset meta tag')
	const stylePosition = head.indexOf(style)
	expect(stylePosition).toBeGreaterThanOrEqual(head.indexOf(charset[0]) + charset[0].length)
	const frameworkStyles =
		head.match(
			/<link\b[^>]*\brel=["']stylesheet["'][^>]*>|<style\b(?![^>]*\bdata-luzzle-configured-styles\b)[^>]*>[\s\S]*?<\/style>/g
		) ?? []
	// The app-template token precedes Kit's head, including linked or inlined component CSS.
	for (const frameworkStyle of frameworkStyles)
		expect(head.indexOf(frameworkStyle)).toBeGreaterThanOrEqual(stylePosition + style.length)
	expect(htmlBody(html)).not.toContain('data-luzzle-configured-styles')
	expect(htmlBody(html)).not.toContain('--color-primary: #123abc;')
	expect(htmlBody(html)).not.toContain('--editor-background:')
	expect(css).not.toContain('box-sizing:')
	expect(css).not.toContain('.button')
	expect(css).not.toContain('.markdown')
	expect(css).not.toContain('pre.shiki')
	expect(css.indexOf('--color-primary:')).toBeGreaterThanOrEqual(0)
	expect(css.indexOf('--editor-background:')).toBeGreaterThan(css.indexOf('--color-primary:'))
	return css
}

async function frameworkCss(html: string) {
	const head = htmlHead(html)
	const sources = [...head.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
		.filter(([tag]) => !tag.includes('data-luzzle-configured-styles'))
		.map(([, css]) => css)
	const links = head.match(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/g) ?? []
	for (const link of links) {
		const href = link.match(/\bhref=["']([^"']+)["']/)?.[1]
		if (!href) throw new Error('Expected a framework stylesheet URL')
		expect(href).toMatch(/\/_app\/immutable\/assets\/[^"']+\.css$/)
		const response = await fetch(new URL(href, origin), {
			signal: AbortSignal.timeout(10000)
		})
		expect(response.status).toBe(200)
		sources.push(await response.text())
	}
	return sources.join('\n')
}

test.each(ogSelections)(
	'serves mapped $name OG HTML from the built fixture over HTTP',
	async ({ name, marker, text }) => {
		for (const job of ['', '&job=current-preview']) {
			const html = await request(`?role=opengraph&type=share-${name}${job}`)
			expect(html).toContain('Catalog title')
			expect(html).toContain(`class="${marker} `)
			expect(html).toContain(text)
			expect(html).toContain('width:1200px;height:630px;')
			expect(html).not.toContain('aria-label="Global"')
			if (name === 'book') {
				expect(html).toContain(
					job
						? '/admin/preview/current-preview/asset/fixture/cover%20medium.jpg'
						: '/pieces/assets/fixture/cover%20medium.jpg'
				)
			}
		}
	}
)

beforeAll(async () => {
	const cache = path.join(webRoot, 'node_modules/.cache')
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'template-ssr-'))
	configFilename = path.join(directory, 'config.yaml')
	await writeFile(
		configFilename,
		JSON.stringify({
			theme: { light: { 'color-primary': '#123abc' } },
			pieces: [
				{
					type: 'custom-kind',
					fields: { title: 'title', date_consumed: 'date' },
					templates: {
						icon: { name: 'default', mapping: { image: 'artwork' } },
						page: {
							name: 'default',
							mapping: {
								image: 'artwork',
								backdrop: 'scenery',
								dateReleased: 'released',
								runtime: 'minutes',
								category: 'category',
								url: 'website',
								isbn: 'isbn',
								people: 'creators'
							}
						},
						opengraph: {
							name: 'default',
							mapping: {
								image: 'artwork',
								backdrop: 'scenery',
								director: 'filmmaker',
								dateReleased: 'released',
								runtime: 'minutes'
							}
						}
					}
				},
				{
					type: 'book-kind',
					fields: { title: 'title', date_consumed: 'date' },
					templates: {
						icon: { name: 'playing-cards' },
						page: {
							name: 'book',
							mapping: {
								image: 'artwork',
								author: 'filmmaker',
								pages: 'pageCount',
								publicationYear: 'bookYear'
							}
						},
						opengraph: { name: 'default' }
					}
				},
				{
					type: 'recipe-kind',
					fields: { title: 'title', date_consumed: 'date' },
					templates: {
						icon: { name: 'lined-notebook-paper' },
						page: {
							name: 'recipe',
							mapping: {
								image: 'artwork',
								ingredients: {
									each: 'materials',
									fields: { item: 'label', quantity: 'amount', unit: 'measure' }
								},
								instructions: { each: 'directions', fields: { html: 'content' } },
								prepMinutes: 'prepMinutes',
								cookMinutes: 'cookMinutes'
							}
						},
						opengraph: { name: 'default' }
					}
				},
				{ type: 'unmapped-kind', fields: { title: 'title', date_consumed: 'date' } },
				...ogSelections.map(({ name, mapping }) => ({
					type: `share-${name}`,
					fields: { title: 'title', date_consumed: 'date' },
					templates: {
						icon: { name: 'poster' },
						page: { name: 'note' },
						opengraph: { name, mapping }
					}
				}))
			]
		})
	)
	buildDirectory = path.join(directory, 'build')
	const env = {
		...process.env,
		NODE_ENV: 'production',
		TEMPLATE_BUILD_DIR: buildDirectory,
		TEMPLATE_KIT_DIR: path.join(directory, 'kit')
	}
	// Compile once, then exercise the native stock components over HTTP.
	await exec(process.execPath, [path.join(webRoot, 'node_modules/vite/bin/vite.js'), 'build'], {
		cwd: fixture,
		env,
		timeout: 60000,
		maxBuffer: 2 * 1024 * 1024
	})
	originalBuild = await buildHashes()
	childEnv = env
	await startFixture()
})

async function startFixture() {
	const child = spawn(
		process.execPath,
		['--input-type=module', '-e', startServer, path.join(buildDirectory, 'index.js')],
		{
			cwd: directory,
			env: {
				...childEnv,
				HOST: '127.0.0.1',
				PORT: '0',
				PROTOCOL_HEADER: 'x-forwarded-proto',
				SOCKET_PATH: '',
				LISTEN_PID: '0',
				LISTEN_FDS: '0'
			},
			stdio: ['ignore', 'ignore', 'pipe', 'ipc']
		}
	)
	server = child
	child.stderr?.on('data', (chunk) => {
		serverErrors += String(chunk)
	})
	const port = await new Promise<number>((resolve, reject) => {
		const timeout = setTimeout(
			() => reject(new Error(`Fixture startup timed out: ${serverErrors}`)),
			10000
		)
		child.once('message', (message) => {
			clearTimeout(timeout)
			if (
				typeof message === 'object' &&
				message !== null &&
				'port' in message &&
				typeof message.port === 'number'
			)
				resolve(message.port)
			else reject(new Error('Invalid fixture server startup message'))
		})
		child.once('error', (error) => {
			clearTimeout(timeout)
			reject(error)
		})
		child.once('exit', (code) => {
			clearTimeout(timeout)
			reject(new Error(`Fixture server exited (${code}): ${serverErrors}`))
		})
	})
	origin = `http://127.0.0.1:${port}`
}

async function stopFixture() {
	if (!server || server.exitCode !== null || server.signalCode !== null) return
	const exited = once(server, 'exit')
	server.kill('SIGTERM')
	const timeout = setTimeout(() => server?.kill('SIGKILL'), 5000)
	try {
		await exited
	} finally {
		clearTimeout(timeout)
	}
}

async function restartWithErrors(error: object) {
	await stopFixture()
	const config = JSON.parse(await readFile(configFilename, 'utf8'))
	config.pages = { error }
	await writeFile(configFilename, JSON.stringify(config))
	await startFixture()
}

afterAll(async () => {
	try {
		await stopFixture()
	} finally {
		if (directory) await rm(directory, { recursive: true, force: true })
	}
})

describe('stock catalog in built SvelteKit SSR', () => {
	test('renders the package-owned poster icon with mapped fields, escaped text and preview URLs', async () => {
		const html = await request('?role=icon&title=%3CStock%3E%26')
		expect(html).toMatch(/class="poster [^"]*\bactive\b/)
		expect(html).toContain('&lt;Stock>&amp;')
		expect(html).toContain('--piece-icon-width: 125px;')
		expect(html).toContain('--piece-icon-height: 187.5px;')
		expect(html).toContain('loading="lazy"')
		expect(html).toContain(`src="${origin}/pieces/assets/fixture/cover%20small.jpg"`)
		expect(html).not.toContain('aria-label="Global"')
		const preview = await request('?role=icon&job=icon%20job')
		expect(preview).toContain('src="/admin/preview/icon%20job/asset/fixture/cover%20small.jpg"')
		expect(preview).not.toContain(`${origin}/pieces/assets/fixture/cover%20small.jpg`)
	})

	test('renders useful stock page HTML by default, explicit supplemental fields and palette navigation', async () => {
		const html = await request()
		expect(html).toMatch(/<h1[^>]*>Catalog title<\/h1>/)
		for (const text of [
			'Fixture category',
			'Ada Example',
			'2001',
			'123 min',
			'Fixture description'
		]) {
			expect(html).toContain(text)
		}
		expect(html).toContain('href="https://example.com/fixture"')
		expect(html).toContain('href="/tags/fixture-tag"')
		expect(html).toContain('<p>Published note</p>')
		expect(html).toContain(`src="${origin}/pieces/assets/fixture/cover%20small.jpg"`)
		expect(html).toContain(`src="${origin}/pieces/assets/fixture/backdrop%20large.jpg"`)
		expect(html.match(/aria-label="Global"/g)).toHaveLength(1)
		const randomHref = html.match(/<a\b[^>]*href="([^"]+)"[^>]*aria-label="random"/)?.[1]
		if (!randomHref) throw new Error('Expected the random navigation link')
		expect(new URL(randomHref, `${origin}/`).href).toBe(`${origin}/random`)
		expect(html).toContain('--banner-background-color: #234567')
		expect(html.indexOf('aria-label="Global"')).toBeLessThan(html.indexOf('<h1'))
		const preview = await request('?role=page&job=page%20job')
		expect(preview).toContain('<p>Draft note</p>')
		expect(preview).not.toContain('<p>Published note</p>')
		expect(preview).toContain('src="/admin/preview/page%20job/asset/fixture/cover%20small.jpg"')
		expect(preview).not.toContain(`${origin}/pieces/assets/`)
		expect(await request('?role=page')).toContain('<p>Published note</p>')
	})

	test('uses the ISBN fallback instead of rendering an unsafe mapped external URL', async () => {
		const html = await request('?role=page&external=javascript%3Aalert%281%29')
		expect(html).toContain('href="https://openlibrary.org/search?isbn=9780000000001"')
		expect(html).not.toContain('href="javascript:')
	})

	test('renders the stock Open Graph catalog with explicit director, backdrop and byline fields', async () => {
		const html = await request('?role=opengraph')
		expect(html).toContain('width:1200px;height:630px;')
		expect(html).toMatch(/<h1[^>]*>\s*Catalog title/)
		expect(html).toContain('by Ada Example')
		expect(html).toContain('2001 · 123 min')
		expect(html).toContain(`src="${origin}/pieces/assets/fixture/cover%20medium.jpg"`)
		expect(html).toContain(`src="${origin}/pieces/assets/fixture/backdrop%20large.jpg"`)
		expect(html).not.toContain('aria-label="Global"')
		const preview = await request('?role=opengraph&job=og%20job')
		expect(preview).toContain('src="/admin/preview/og%20job/asset/fixture/cover%20medium.jpg"')
		expect(preview).toContain('src="/admin/preview/og%20job/asset/fixture/backdrop%20large.jpg"')
		expect(preview).not.toContain(`${origin}/pieces/assets/`)
	})

	test('renders an independently mapped book page in native HTTP without changing icon choice', async () => {
		const book = await request('?role=page&type=book-kind')
		expect(book).toContain('by Ada Example · 320 pages')
		expect(book).toContain('2001')
		expect(book).toContain('class="book ')
		expect(book).toContain('<p>Published note</p>')
		expect(book).toContain(`src="${origin}/pieces/assets/fixture/cover%20small.jpg"`)
		expect(await request('?role=icon&type=book-kind')).toContain('cards-container')
	})

	test('renders structured recipe data and job-preview assets through native HTTP', async () => {
		const recipe = await request('?role=page&type=recipe-kind&job=recipe%20job')
		expect(recipe).toContain('Flour')
		expect(recipe).toContain('1/2')
		expect(recipe).toContain('<em>Mix ingredients</em>')
		expect(recipe).toContain('1 ingredients · 12m')
		expect(recipe).toContain('type="checkbox"')
		expect(recipe).toContain('<p>Draft note</p>')
		expect(recipe).toContain('src="/admin/preview/recipe%20job/asset/fixture/cover%20card.jpg"')
		expect(recipe).not.toContain(`${origin}/pieces/assets/`)
	})

	test('uses all three poster defaults without inferring presentation fields from raw metadata', async () => {
		for (const role of ['icon', 'page', 'opengraph']) {
			// Raw metadata legitimately remains in Kit's bootstrap data; check rendered HTML only.
			const html = (
				await request(`?role=${role}&type=unmapped-kind&title=%3CDefault%3E%26`)
			).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
			expect(html).toContain('&lt;Default>&amp;')
			expect(html).not.toContain('src=')
			expect(html).not.toContain('by Ada Example')
			expect(html).not.toContain('Fixture category')
			expect(html).not.toContain('123 min')
			if (role !== 'page') expect(html).not.toContain('aria-label="Global"')
		}
	})

	test('omits configured CSS from stock pages without a layout opt-in', async () => {
		const html = await request()
		expect(html).toContain('Catalog title')
		expectNoConfiguredCss(html)
	})

	test('inlines only configured theme and editor CSS once for an opted-in layout', async () => {
		for (let attempt = 0; attempt < 2; attempt++) {
			const html = await request('themed')
			expect(html).toContain('<h1>Themed fixture</h1>')
			const css = expectInlineConfiguredCss(html)
			expect(css).toContain('--color-primary: #123abc;')
			expect(css).toContain('--color-primary: #3b82f6;')
			expect(css).toContain("section[data-theme='dark']")
			expect(css).toContain('--editor-background: #fff;')
			expect(css).toContain('--editor-background: #24292e;')
			expect(css).toContain('--editor-heading:')
			expect(html).not.toContain('theme.css')
			// Opt-in must not leak into the next request on the same server.
			expectNoConfiguredCss(await request())
		}
	})

	test('keeps fixed reset, base and Markdown CSS in the normal framework pipeline', async () => {
		const html = await request('themed')
		expectInlineConfiguredCss(html)
		// Kit may inline manifest CSS instead of emitting external stylesheet links.
		const css = await frameworkCss(html)
		expect(css).toMatch(/box-sizing:\s*border-box/)
		expect(css).toContain('.button')
		expect(css).toContain('.markdown')
		expect(css).toContain('pre.shiki')
		expect(css).not.toContain('--color-primary: #123abc;')
	})

	test('keeps the unique configured declaration only in the head, never in bootstrap data', async () => {
		const html = await request('themed')
		expectInlineConfiguredCss(html)
		const declaration = '--color-primary: #123abc;'
		expect(htmlHead(html).split(declaration)).toHaveLength(2)
		// Include scripts: no CSS packet should be serialized for hydration.
		expect(htmlBody(html)).not.toContain(declaration)
		expect(htmlBody(html)).not.toContain('data-luzzle-configured-styles')
	})

	test('leaves every compiled application file unchanged across stock rendering and preview requests', async () => {
		expect(await buildHashes()).toEqual(originalBuild)
	})
})

async function errorResponse(
	route: string,
	accept: string | null = 'text/html',
	init: RequestInit = {}
) {
	const headers = new Headers(init.headers)
	if (accept !== null) headers.set('accept', accept)
	headers.set('x-forwarded-proto', 'http')
	return fetch(`${origin}/${route}`, {
		...init,
		headers,
		signal: AbortSignal.timeout(10000)
	})
}

async function errorHtml(kind: number | 'unknown' | 'unmatched', status?: number) {
	const route = kind === 'unmatched' ? 'no-such-fixture-page' : `errors/${kind}`
	const response = await errorResponse(route)
	expect(response.status).toBe(status ?? (typeof kind === 'number' ? kind : 404))
	expect(response.headers.get('content-type')).toContain('text/html')
	const html = await response.text()
	for (const privateValue of [directory, configFilename, '/private/fixture-secret'])
		expect(html).not.toContain(privateValue)
	return html
}

function expectErrorHome(html: string, visible: boolean) {
	const rendered = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
	const homeLinks = rendered.match(/<a\b[^>]*\bclass="[^"]*\bhome-button\b[^"]*"[^>]*>/g) ?? []
	expect(homeLinks.length > 0).toBe(visible)
}

function expectNoErrorPresentation(body: string) {
	for (const forbidden of [
		'Fixture missing copy',
		'Fixture client copy',
		'Fixture server copy',
		'presentation',
		directory,
		configFilename,
		'sections/error-',
		'/private/fixture-secret',
		'Fixture private failure'
	])
		expect(body).not.toContain(forbidden)
}

describe('configured error pages through the native fixture HTTP server', () => {
	test('keeps native expected errors and safe unknown-error defaults when unconfigured', async () => {
		for (const status of [404, 400, 403, 500, 503]) {
			const html = await errorHtml(status)
			expect(html).toContain(`Fixture expected ${status}`)
			expectErrorHome(html, true)
		}
		const unknown = await errorHtml('unknown', 500)
		expect(unknown).toContain('Internal Error')
		expect(unknown).not.toContain('Fixture private failure')
		expectErrorHome(unknown, true)
		expect(await errorHtml('unmatched')).toContain('page not found')
	})

	test('selects 404 before 4xx, shares 500 across 5xx without changing status, and sanitizes Markdown', async () => {
		await mkdir(path.join(directory, 'sections'), { recursive: true })
		await writeFile(
			path.join(directory, 'sections/error-404.md'),
			'# Fixture missing copy\n\nTry [the catalog](/pieces).\n\n<script>window.errorInjected=1</script>\n\n[unsafe](javascript:alert(1))\n\n[data link](data:text/html,unsafe)'
		)
		await writeFile(path.join(directory, 'sections/error-4xx.md'), '# Fixture client copy')
		await writeFile(path.join(directory, 'sections/error-500.md'), '# Fixture server copy')
		await restartWithErrors({
			'404': { body: 'sections/error-404.md', home: false },
			'4xx': { body: 'sections/error-4xx.md' },
			'500': { body: 'sections/error-500.md', home: false }
		})
		for (const kind of [404, 400, 403, 500, 503, 'unknown', 'unmatched'] as const) {
			let status: number
			if (typeof kind === 'number') status = kind
			else if (kind === 'unknown') status = 500
			else status = 404

			let selected = 'server'
			if (status === 404) selected = 'missing'
			else if (status < 500) selected = 'client'
			const html = await errorHtml(kind, status)
			expect(html).toContain(`<h1>Fixture ${selected} copy</h1>`)
			for (const other of ['missing', 'client', 'server'].filter((name) => name !== selected))
				expect(html).not.toContain(`Fixture ${other} copy`)
			expectErrorHome(html, selected === 'client')
			expect(html).not.toContain('sections/error-')
			expect(html).not.toContain('Fixture private failure')
			if (status === 404) {
				expect(html).toContain('href="/pieces"')
				expect(html).toContain('&lt;script&gt;')
				expect(html).not.toContain('<script>window.errorInjected=1</script>')
				expect(html).not.toMatch(/href=["'](?:javascript|data):/i)
			}
		}
	})

	test('preserves native error formats and includes presentation only for eligible UI requests', async () => {
		for (const accept of ['application/json', 'application/json;q=1, text/html;q=0.5']) {
			// Kit renders matched pure-page loader errors as HTML regardless of Accept.
			for (const kind of [404, 403, 503, 'unknown'] as const) {
				const response = await errorResponse(`errors/${kind}`, accept)
				expect(response.status).toBe(kind === 'unknown' ? 500 : kind)
				expect(response.headers.get('content-type')).toContain('text/html')
				const body = await response.text()
				expectNoErrorPresentation(body)
				expect(body).toContain(kind === 'unknown' ? 'Internal Error' : `Fixture expected ${kind}`)
				if (kind === 404) expect(body).toContain('page not found')
				expectErrorHome(body, true)
			}
			const unmatched = await errorResponse('no-such-fixture-page', accept)
			expect(unmatched.status).toBe(404)
			expect(unmatched.headers.get('content-type')).toContain('text/html')
			const missingBody = await unmatched.text()
			expect(missingBody).toContain('page not found')
			expectNoErrorPresentation(missingBody)

			const endpoint = await errorResponse('errors/endpoint', accept)
			expect(endpoint.status).toBe(503)
			expect(endpoint.headers.get('content-type')).toContain('application/json')
			const endpointBody = await endpoint.text()
			expectNoErrorPresentation(endpointBody)
			expect(JSON.parse(endpointBody).message).toBe('Fixture endpoint unavailable')
		}
		const data = await errorResponse('errors/403/__data.json', 'application/json')
		expect(data.headers.get('content-type')).toContain('application/json')
		const dataBody = await data.text()
		expect(JSON.parse(dataBody)).toMatchObject({
			type: 'data',
			nodes: expect.arrayContaining([
				expect.objectContaining({
					type: 'error',
					error: expect.objectContaining({
						status: 403,
						message: 'Fixture expected 403',
						presentation: {
							html: expect.stringContaining('<h1>Fixture client copy</h1>'),
							home: true
						}
					})
				})
			])
		})
		for (const privateValue of [
			directory,
			configFilename,
			'sections/error-',
			'/private/fixture-secret'
		])
			expect(dataBody).not.toContain(privateValue)

		const action = await errorResponse('errors/403', 'application/json', {
			method: 'POST',
			headers: {
				origin,
				'content-type': 'application/x-www-form-urlencoded',
				'x-sveltekit-action': 'true'
			},
			body: ''
		})
		expect(action.status).toBe(403)
		const actionBody = await action.text()
		expect(JSON.parse(actionBody)).toMatchObject({
			type: 'error',
			error: { status: 403, message: 'Fixture action denied' }
		})
		expect(actionBody).toContain('Fixture action denied')
		expectNoErrorPresentation(actionBody)

		for (const accept of [null, '*/*', 'application/json']) {
			const response = await errorResponse('errors/403', accept, {
				method: 'POST',
				headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
				body: ''
			})
			expect(response.status).toBe(403)
			expect(response.headers.get('content-type')).toContain('application/json')
			const body = await response.text()
			expect(JSON.parse(body)).toMatchObject({
				type: 'error',
				error: { status: 403, message: 'Fixture action denied' }
			})
			expect(body).toContain('Fixture action denied')
			expectNoErrorPresentation(body)
		}

		const htmlAction = await errorResponse('errors/403', 'text/html', {
			method: 'POST',
			headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
			body: ''
		})
		expect(htmlAction.status).toBe(403)
		expect(htmlAction.headers.get('content-type')).toContain('text/html')
		expect(await htmlAction.text()).toContain('<h1>Fixture client copy</h1>')

		const endpoint = await errorResponse('errors/endpoint', 'text/html')
		expect(endpoint.status).toBe(503)
		expect(endpoint.headers.get('content-type')).toContain('text/html')
		expectNoErrorPresentation(await endpoint.text())
	})

	test('keeps 404 independent of 4xx and supports home-only overrides without inheriting its body', async () => {
		await restartWithErrors({ '4xx': { body: 'sections/error-4xx.md', home: false } })
		for (const kind of [404, 'unmatched'] as const) {
			const html = await errorHtml(kind)
			expect(html).toContain('page not found')
			expect(html).not.toContain('Fixture client copy')
			expectErrorHome(html, true)
		}
		const forbidden = await errorHtml(403)
		expect(forbidden).toContain('<h1>Fixture client copy</h1>')
		expectErrorHome(forbidden, false)
		await restartWithErrors({
			'404': { home: false },
			'4xx': { body: 'sections/error-4xx.md', home: false },
			'500': { home: false }
		})
		const notFound = await errorHtml(404)
		expect(notFound).toContain('page not found')
		expect(notFound).toContain('Fixture expected 404')
		expect(notFound).not.toContain('Fixture client copy')
		expectErrorHome(notFound, false)
		const failed = await errorHtml(503)
		expect(failed).toContain('Fixture expected 503')
		expectErrorHome(failed, false)
	})

	test('falls back safely when the selected Markdown is missing or cannot be read as a file', async () => {
		// A directory gives a deterministic read failure without relying on chmod or the test UID.
		await mkdir(path.join(directory, 'sections/error-directory'), { recursive: true })
		await restartWithErrors({
			'404': { body: 'sections/error-missing.md', home: false },
			'4xx': { body: 'sections/error-directory' },
			'500': { body: 'sections/error-missing-server.md' }
		})
		for (const status of [404, 400, 403, 500, 503]) {
			const html = await errorHtml(status)
			expect(html).toContain(`Fixture expected ${status}`)
			expectErrorHome(html, status !== 404)
			expect(html).not.toContain('sections/error-')
			expect(html).not.toContain('Unable to load Markdown')
		}
		const unknown = await errorHtml('unknown', 500)
		expect(unknown).toContain('Internal Error')
		expect(unknown).not.toContain('Fixture private failure')
		expect(await request()).toContain('Catalog title')
		await writeFile(path.join(directory, 'sections/error-missing.md'), '# Recovered missing copy')
		expect(await errorHtml(404)).not.toContain('Recovered missing copy')
		await stopFixture()
		await startFixture()
		const recovered = await errorHtml(404)
		expect(recovered).toContain('<h1>Recovered missing copy</h1>')
		expectErrorHome(recovered, false)
	})

	test('loads only the selected file lazily and keeps shared cache/config fixed across atomic replacements until restart', async () => {
		const shared = path.join(directory, 'sections/error-shared.md')
		const separate = path.join(directory, 'sections/error-separate.md')
		await writeFile(shared, '# Before startup')
		await writeFile(separate, '# Server before startup')
		await writeFile(path.join(directory, 'sections/error-new.md'), '# Restart configuration copy')
		await restartWithErrors({
			'404': { body: 'sections/error-shared.md' },
			'4xx': { body: 'sections/error-shared.md' },
			'500': { body: 'sections/error-separate.md' }
		})
		await writeFile(shared, '# First selected copy')
		expect(await errorHtml(404)).toContain('<h1>First selected copy</h1>')
		await writeFile(`${shared}.next`, '# Atomic replacement copy')
		await rename(`${shared}.next`, shared)
		await writeFile(separate, '# Unselected server copy')
		expect(await errorHtml(400)).toContain('<h1>First selected copy</h1>')
		expect(await errorHtml(503)).toContain('<h1>Unselected server copy</h1>')

		const config = JSON.parse(await readFile(configFilename, 'utf8'))
		config.pages.error['404'] = { body: 'sections/error-new.md', home: false }
		await writeFile(`${configFilename}.next`, JSON.stringify(config))
		await rename(`${configFilename}.next`, configFilename)
		const beforeRestart = await errorHtml(404)
		expect(beforeRestart).toContain('<h1>First selected copy</h1>')
		expectErrorHome(beforeRestart, true)
		await stopFixture()
		await startFixture()
		const afterRestart = await errorHtml(404)
		expect(afterRestart).toContain('<h1>Restart configuration copy</h1>')
		expectErrorHome(afterRestart, false)
		expect(await errorHtml(400)).toContain('<h1>Atomic replacement copy</h1>')
		expect(await buildHashes()).toEqual(originalBuild)
	})
})
