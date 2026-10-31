import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const fixture = fileURLToPath(new URL('../fixtures/templates/', import.meta.url))
const webRoot = fileURLToPath(new URL('../../', import.meta.url))
let directory: string
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
	const configFilename = path.join(directory, 'config.yaml')
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
	const child = spawn(
		process.execPath,
		['--input-type=module', '-e', startServer, path.join(buildDirectory, 'index.js')],
		{
			cwd: directory,
			env: {
				...env,
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
})

afterAll(async () => {
	try {
		if (server && server.exitCode === null && server.signalCode === null) {
			const exited = once(server, 'exit')
			server.kill('SIGTERM')
			const timeout = setTimeout(() => server?.kill('SIGKILL'), 5000)
			try {
				await exited
			} finally {
				clearTimeout(timeout)
			}
		}
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
		expect(html).toContain('href="/random"')
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
