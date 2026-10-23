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
const repository = path.resolve(webRoot, '../..')
let directory: string
let preparedDirectory: string
let configFilename: string
let buildDirectory: string
let origin: string
let server: ChildProcess | undefined
let serverErrors = ''
let sourceNumber = 0
let originalBuild: Record<string, string>

const startServer = `
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
const { server } = await import(pathToFileURL(process.argv[1]).href);
if (!server.server.listening) await once(server.server, 'listening');
process.send({ port: server.server.address().port });
`

async function publishSource(source: string, color: string) {
	const filename = path.join(directory, `feed-${sourceNumber++}.svelte`)
	await writeFile(filename, source)
	const config = JSON.parse(await readFile(configFilename, 'utf8'))
	config.content = { component: { feed: filename } }
	config.theme = { light: { 'color-primary': color } }
	await writeFile(configFilename, JSON.stringify(config))
	const { stdout } = await exec(
		process.execPath,
		[
			path.join(repository, 'packages/web/worker/dist/src/commands/publish-templates.js'),
			'--config',
			configFilename
		],
		{ cwd: fixture, timeout: 30000 }
	)
	return JSON.parse(stdout) as { revision: string }
}

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

function htmlHead(html: string): string {
	const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
	if (head === undefined) throw new Error('Expected an HTML head from the SSR fixture')
	return head
}

async function request(query = '') {
	const response = await fetch(`${origin}/${query}`, {
		headers: { 'x-forwarded-proto': 'http' },
		signal: AbortSignal.timeout(10000)
	})
	expect(response.status).toBe(200)
	return response.text()
}

beforeAll(async () => {
	const cache = path.join(webRoot, 'node_modules/.cache')
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'template-ssr-'))
	preparedDirectory = path.join(directory, 'prepared')
	configFilename = path.join(directory, 'config.yaml')
	await writeFile(
		configFilename,
		JSON.stringify({
			paths: { prepared: './prepared' },
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
				{ type: 'unmapped-kind', fields: { title: 'title', date_consumed: 'date' } }
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
	// The application is compiled before any owner template exists.
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
				ORIGIN: '',
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

const firstSource = `
<script>let { data } = $props()</script>
<article class="prepared">First {data.pieces[0].title}</article>
<style>.prepared { color: var(--color-primary); }</style>
`

describe('site/feed publication and stock catalog in built SvelteKit SSR', () => {
	test('starts with built-in presentation before a revision is available', async () => {
		const html = await request()
		expect(html).toContain('Built-in presentation')
		expect(html).not.toContain('aria-label="Global"')
	})

	test('renders a newly prepared template with its component and theme CSS without rebuilding', async () => {
		const published = await publishSource(firstSource, '#135790')
		const html = await request('?title=%3COne%3E%26')
		expect(html).toContain(published.revision)
		expect(html).toContain('First &lt;One>&amp;')
		const scopedClass = html.match(/<article class="prepared (svelte-[a-z0-9]+)">/)?.[1]
		expect(scopedClass).toBeDefined()
		const head = htmlHead(html)
		expect(head).toMatch(
			new RegExp(`\\.prepared\\.${scopedClass}\\s*\\{[^}]*color:\\s*var\\(--color-primary\\)`)
		)
		const theme = head.match(/<style[^>]*data-prepared-theme[^>]*>([\s\S]*?)<\/style>/)?.[1]
		expect(theme).toContain('--color-primary: #135790;')
	})

	test('switches site/feed revision and supports normal module initialization with fresh request data', async () => {
		const source = `<script module>const prefix = await Promise.resolve('Second')</script>
<script>import { getContext } from 'svelte'; let { data } = $props(); const missing = getContext('missing')</script>
<p>{prefix} {missing ?? data.pieces[0].title}</p>`
		const published = await publishSource(source, '#246801')
		const html = await request('?title=Changed')
		expect(html).toContain(published.revision)
		expect(html).toContain('Second Changed')
		expect(htmlHead(html)).toContain('--color-primary: #246801;')
	})

	test('keeps the previous selected site/feed revision when the real publication command fails', async () => {
		const published = await publishSource(firstSource, '#135790')
		const pointer = await readFile(path.join(preparedDirectory, 'current.json'), 'utf8')
		await expect(publishSource('<div>', '#abcdef')).rejects.toMatchObject({ code: 1 })
		expect(await readFile(path.join(preparedDirectory, 'current.json'), 'utf8')).toBe(pointer)
		const html = await request('?title=Still%20selected')
		expect(html).toContain(published.revision)
		expect(html).toContain('First Still selected')
		expect(htmlHead(html)).toContain('--color-primary: #135790;')
		expect(htmlHead(html)).not.toContain('--color-primary: #abcdef;')
	})

	test('lets the caller report rendering errors and choose built-in fallback', async () => {
		await publishSource(
			'<script>throw new Error("prepared render failure")</script><p>Never rendered</p>',
			'#abcdef'
		)
		const html = await request()
		expect(html).toContain('Built-in presentation')
		expect(html).not.toContain('--color-primary: #abcdef;')
		expect(serverErrors).toContain('prepared render failure')
	})

	test('lets the caller fall back when selected CSS is missing', async () => {
		const published = await publishSource(firstSource, '#abcdef')
		await rm(path.join(preparedDirectory, 'revisions', published.revision, 'theme.css'))
		const html = await request()
		expect(html).toContain('Built-in presentation')
		expect(html).not.toContain(preparedDirectory)
		expect(serverErrors).toContain('theme.css')
	})

	test('lets the caller fall back when a selected module has incompatible exports', async () => {
		const published = await publishSource(firstSource, '#abcdef')
		await writeFile(
			path.join(preparedDirectory, 'revisions', published.revision, 'templates.mjs'),
			'export const wrong = true;'
		)
		expect(await request()).toContain('Built-in presentation')
		expect(serverErrors).toContain('Invalid prepared template exports')
	})

	test('keeps existing body/head-only prepared modules compatible without new exports', async () => {
		const published = await publishSource(firstSource, '#135790')
		await writeFile(
			path.join(preparedDirectory, 'revisions', published.revision, 'templates.mjs'),
			'export const templateLookup = {site:{feed:"feed"}}; export function render(){return {body:"Older module",head:""}};'
		)
		const html = await request()
		expect(html).toContain('Older module')
		expect(html).not.toContain('Built-in presentation')
	})

	test('renders site/feed helpers with separate published and preview asset contexts', async () => {
		const source = `<script>
let { data, helpers } = $props();
const piece = helpers.forPiece(data.pieces[0]);
const image = piece.getImageUrl(data.pieces[0].metadata.cover, 125, 'jpg');
const note = piece.getAssetContent(data.pieces[0].key, 'markdown');
const palette = piece.getPalette();
const mark = helpers.getStaticAssetUrl('images/mark.svg');
</script>
<a id="piece-link" href={piece.getUrl()}>{data.pieces[0].title}</a>
<img id="cover" src={image} alt="Cover" />
<a id="asset-link" href={piece.getAssetUrl('cover', 'image.s.jpg')}>Asset</a>
<p id="palette" data-accent={palette?.accent}>Palette</p>
{@html note ?? ''}
<img id="mark" src={mark} alt="Mark" />`
		await publishSource(source, '#135790')
		const published = await request()
		expect(published).toContain(`href="${origin}/pieces/custom-kind/prepared%20piece"`)
		expect(published).toContain(`src="${origin}/pieces/assets/fixture/cover%20small.jpg"`)
		expect(published).toContain(`href="${origin}/pieces/assets/fixture/cover%20small.jpg"`)
		expect(published).toContain('data-accent="#123456"')
		expect(published).toContain('<p>Published note</p>')
		expect(published).toContain(`src="${origin}/site-assets/images/mark.svg"`)
		const staticAsset = await fetch(`${origin}/site-assets/images/mark.svg`)
		expect(staticAsset.status).toBe(200)
		expect(await staticAsset.text()).toContain('Fixture mark')

		const preview = await request('?job=selected%20job')
		expect(preview).toContain('src="/admin/preview/selected%20job/asset/fixture/cover%20small.jpg"')
		expect(preview).toContain(
			'href="/admin/preview/selected%20job/asset/fixture/cover%20small.jpg"'
		)
		expect(preview).not.toContain(`${origin}/pieces/assets/fixture/cover%20small.jpg`)
		expect(preview).toContain('<p>Draft note</p>')
		expect(preview).not.toContain('<p>Published note</p>')
		expect(preview).toContain(`href="${origin}/pieces/custom-kind/prepared%20piece"`)
		expect(await request()).toContain('<p>Published note</p>')
	})

	test('renders requested navigation as the real app banner before custom content', async () => {
		const source = `<script>
let { data, helpers } = $props();
const palette = helpers.forPiece(data.pieces[0]).getPalette();
if (data.pieces[0].title !== 'omitted') {
  if (data.pieces[0].title === 'defaults') helpers.showNavBanner();
  else helpers.showNavBanner({ background: palette?.accent, color: 'var(--color-on-primary)', hoverColor: 'var(--color-secondary)' });
}
if (data.pieces[0].title === 'updated') helpers.showNavBanner({ background: 'var(--color-surface-container)' });
if (data.pieces[0].title === 'throwing') throw new Error('failed after requesting navigation');
</script>
<svelte:head><title>Owner page {data.pieces[0].title}</title><meta name="description" content="Prepared server content" /></svelte:head>
<main id="custom-content" style:background={palette?.accent}><p>{data.pieces[0].title}</p></main>`
		await publishSource(source, '#135790')
		const html = await request('?title=normal')
		expect(html.match(/aria-label="Global"/g)).toHaveLength(1)
		expect(html).toContain('aria-label="main page"')
		expect(html).toContain('aria-label="search"')
		expect(html).toContain('aria-label="change theme"')
		expect(html).not.toContain('href="/random"')
		expect(html).toContain('--banner-background-color: #123456')
		expect(html).toContain('<main id="custom-content" style="background: #123456')
		expect(html).toContain('--banner-text-color: var(--color-on-primary)')
		expect(html).toContain('--banner-hover-color: var(--color-secondary)')
		expect(htmlHead(html)).toContain('<title>Owner page normal</title>')
		expect(htmlHead(html)).toContain('name="description" content="Prepared server content"')
		expect(html.indexOf('aria-label="Global"')).toBeLessThan(
			html.indexOf('<main id="custom-content"')
		)
		const navClass = html.match(/<nav[^>]*class="banner (svelte-[a-z0-9]+)"/)?.[1]
		expect(navClass).toBeDefined()
		const head = htmlHead(html)
		let deliveredCss = head
		for (const match of head.matchAll(/<link[^>]*href="([^"]+\.css)"[^>]*>/g)) {
			const response = await fetch(new URL(match[1], `${origin}/`))
			expect(response.status).toBe(200)
			deliveredCss += await response.text()
		}
		expect(deliveredCss).toContain(`.banner.${navClass}`)
		expect(deliveredCss).toContain('--banner-background-color')

		const defaults = await request('?title=defaults')
		expect(defaults).toContain('aria-label="Global"')
		expect(defaults).toContain('aria-label="main page"')
		expect(defaults).toContain('aria-label="search"')
		expect(defaults).toContain('aria-label="change theme"')
		expect(defaults).not.toContain('href="/random"')
		expect(defaults).toContain('--banner-background-color: transparent')
		const updated = await request('?title=updated')
		expect(updated.match(/aria-label="Global"/g)).toHaveLength(1)
		expect(updated).toContain('--banner-background-color: var(--color-surface-container)')
		expect(updated).toContain('--banner-text-color: var(--color-on-surface)')
		const omitted = await request('?title=omitted')
		expect(omitted).not.toContain('aria-label="Global"')
		expect(omitted).toContain('<main id="custom-content"')
		const failure = await request('?title=throwing')
		expect(failure).toContain('Built-in presentation')
		expect(failure).not.toContain('aria-label="Global"')
		expect(failure).not.toContain('Owner page throwing')
		expect(serverErrors).toContain('failed after requesting navigation')
		expect(await request('?title=after-error')).toContain('aria-label="Global"')
	})

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

	test('renders useful stock page HTML, explicit supplemental fields and palette navigation', async () => {
		const html = await request('?role=page')
		expect(html).toMatch(/<h1[^>]*>Prepared title<\/h1>/)
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
		expect(html).toMatch(/<h1[^>]*>\s*Prepared title/)
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

	test('keeps stock piece SSR independent of a broken selected site bundle', async () => {
		const published = await publishSource(firstSource, '#135790')
		await writeFile(
			path.join(preparedDirectory, 'revisions', published.revision, 'templates.mjs'),
			'export const wrong = true;'
		)
		expect(await request()).toContain('Built-in presentation')
		expect(await request('?role=page')).toContain('<p>Published note</p>')
		expect(await request('?role=icon')).toContain('class="poster')
		expect(await request('?role=opengraph')).toContain('by Ada Example')
	})

	test('leaves every compiled application file unchanged across publication and fallback', async () => {
		expect(await buildHashes()).toEqual(originalBuild)
	})
})
