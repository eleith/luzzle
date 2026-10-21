import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const fixture = fileURLToPath(new URL('../fixtures/templates/', import.meta.url))
const webRoot = fileURLToPath(new URL('../../', import.meta.url))
const repository = path.resolve(webRoot, '../..')
let directory: string
let preparedDirectory: string
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

const publish = `
import path from 'node:path';
const [publisherUrl, configUrl, sourceFile, preparedDirectory, color, pieceType, iconFiles, opengraphFile] = process.argv.slice(1);
const { publishTemplateBundle } = await import(publisherUrl);
const { validateConfig } = await import(configUrl);
const pieces = new Map([[pieceType, { page: sourceFile, ...(opengraphFile ? { opengraph: opengraphFile } : {}) }]]);
for (const [type, icon] of Object.entries(JSON.parse(iconFiles))) pieces.set(type, { ...pieces.get(type), icon });
const config = validateConfig({
 pieces: [...pieces].map(([type, components]) => ({ type, fields: { title: 'title', date_consumed: 'date' }, components })),
 theme: { light: { 'color-primary': color } }
});
config.paths.config = path.join(path.dirname(sourceFile), 'config.yaml');
console.log(JSON.stringify(await publishTemplateBundle(config, preparedDirectory)));
`

async function publishSource(
	source: string,
	color: string,
	type = 'custom-kind',
	icons: Record<string, string> = {},
	opengraph?: string
) {
	const filename = path.join(directory, `source-${sourceNumber++}.svelte`)
	await writeFile(filename, source)
	const opengraphFile =
		opengraph === undefined ? '' : path.join(directory, `opengraph-${sourceNumber++}.svelte`)
	if (opengraph !== undefined) await writeFile(opengraphFile, opengraph)
	const iconFiles = new Map<string, string>()
	const iconSources = new Map<string, string>()
	for (const [type, source] of Object.entries(icons)) {
		let iconFile = iconSources.get(source)
		if (!iconFile) {
			iconFile = path.join(directory, `icon-${sourceNumber++}.svelte`)
			await writeFile(iconFile, source)
			iconSources.set(source, iconFile)
		}
		iconFiles.set(type, iconFile)
	}
	const { stdout } = await exec(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			publish,
			pathToFileURL(path.join(repository, 'packages/web/worker/dist/src/templates/publish.js'))
				.href,
			pathToFileURL(path.join(repository, 'packages/web/config/dist/src/index.js')).href,
			filename,
			preparedDirectory,
			color,
			type,
			JSON.stringify(Object.fromEntries(iconFiles)),
			opengraphFile
		],
		{ timeout: 30000 }
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
	buildDirectory = path.join(directory, 'build')
	const env = {
		...process.env,
		TEMPLATE_BUILD_DIR: buildDirectory,
		TEMPLATE_KIT_DIR: path.join(directory, 'kit'),
		TEMPLATE_PREPARED_DIR: preparedDirectory
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
			cwd: fixture,
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
		child.once('message', (message) => {
			if (
				typeof message === 'object' &&
				message !== null &&
				'port' in message &&
				typeof message.port === 'number'
			)
				resolve(message.port)
			else reject(new Error('Invalid fixture server startup message'))
		})
		child.once('error', reject)
		child.once('exit', (code) =>
			reject(new Error(`Fixture server exited (${code}): ${serverErrors}`))
		)
	})
	origin = `http://127.0.0.1:${port}`
})

afterAll(async () => {
	if (server && server.exitCode === null) {
		const exited = once(server, 'exit')
		server.kill('SIGTERM')
		const timeout = setTimeout(() => server?.kill('SIGKILL'), 5000)
		await exited
		clearTimeout(timeout)
	}
	if (directory) await rm(directory, { recursive: true, force: true })
})

const firstSource = `
<script>let { data } = $props()</script>
<article class="prepared">First {data.piece.title}</article>
<style>.prepared { color: var(--color-primary); }</style>
`

describe('prepared templates in built SvelteKit SSR', () => {
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

	test('switches revision and supports normal module initialization and a new arbitrary type', async () => {
		const source = `<script module>const prefix = await Promise.resolve('Second')</script>
<script>import { getContext } from 'svelte'; let { data } = $props(); const missing = getContext('missing')</script>
<p>{prefix} {missing ?? data.piece.title}</p>`
		const published = await publishSource(source, '#246801', 'new-kind')
		const html = await request('?type=new-kind&title=Changed')
		expect(html).toContain(published.revision)
		expect(html).toContain('Second Changed')
		expect(htmlHead(html)).toContain('--color-primary: #246801;')
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
			'export const templateLookup = {pieces:{"custom-kind":{page:"page"}},site:{}}; export function render(){return {body:"Older module",head:""}};'
		)
		const html = await request()
		expect(html).toContain('Older module')
		expect(html).not.toContain('Built-in presentation')
	})

	test('renders real piece helpers with separate published and preview contexts', async () => {
		const source = `<script>
let { data, helpers } = $props();
const piece = helpers.forPiece(data.piece);
const image = piece.getImageUrl(data.piece.metadata.cover, 125, 'jpg');
const note = piece.getAssetContent(data.piece.key, 'markdown');
const palette = piece.getPalette();
const mark = helpers.getStaticAssetUrl('images/mark.svg');
</script>
<a id="piece-link" href={piece.getUrl()}>{data.piece.title}</a>
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
const palette = helpers.forPiece(data.piece).getPalette();
if (data.piece.title !== 'omitted') {
  if (data.piece.title === 'defaults') helpers.showNavBanner();
  else helpers.showNavBanner({ background: palette?.accent, color: 'var(--color-on-primary)', hoverColor: 'var(--color-secondary)' });
}
if (data.piece.title === 'updated') helpers.showNavBanner({ background: 'var(--color-surface-container)' });
if (data.piece.title === 'throwing') throw new Error('failed after requesting navigation');
</script>
<svelte:head><title>Owner page {data.piece.title}</title><meta name="description" content="Prepared server content" /></svelte:head>
<main id="custom-content" style:background={palette?.accent}><p>{data.piece.title}</p></main>`
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

	test('renders configured and canonical default icons with one SSR stylesheet and real request helpers', async () => {
		const icon = `<svelte:options css="injected" />
<script>let { data, options, helpers } = $props()</script>
<svelte:head><meta name="icon-piece" content={data.piece.title} /><style>.manual-icon-style { color: var(--color-primary); }</style></svelte:head>
<a class="prepared-icon" href={helpers.forPiece(data.piece).getUrl()}
 data-size={options.size.width + 'x' + options.size.height} data-lazy={options.lazy} data-active={options.active}
 data-page-control={typeof helpers.showNavBanner}>
 <img src={helpers.forPiece(data.piece).getImageUrl('cover', options.size.width, 'jpg')} alt="Prepared cover" />
 {data.piece.title}
</a>
<style>.prepared-icon { color: var(--color-secondary); }</style>`
		const source = `<script>let { data, components } = $props()</script>
<svelte:head><title>Icon page {data.piece.title}</title></svelte:head>
<main class="icon-page">
<components.PieceIcon piece={data.piece} size={{ width: 125 }} />
<components.PieceIcon piece={{ ...data.piece, type: '__proto__', title: 'Related' }} size={{ width: 80, height: 93 }} lazy active />
<components.PieceIcon piece={{ ...data.piece, type: 'unknown-kind', title: '<Default>&' }} size={{ width: 90, height: 111 }} lazy active />
</main>
<style>.icon-page { background: var(--color-surface); }</style>`
		await publishSource(
			source,
			'#135790',
			'custom-kind',
			Object.fromEntries([
				['custom-kind', icon],
				['__proto__', icon]
			])
		)
		const html = await request('?title=%3CPiece%3E%26')
		expect(html).toContain('data-size="125x187.5" data-lazy="false" data-active="false"')
		expect(html).toContain('data-size="80x93" data-lazy="true" data-active="true"')
		expect(html).toContain('data-page-control="undefined"')
		expect(html).toContain('href="' + origin + '/pieces/__proto__/prepared%20piece"')
		expect(html).toMatch(/class="default-icon [^"]*\bactive\b/)
		expect(html).toContain('--piece-icon-height: 111px;')
		expect(html).toContain('&lt;Default>&amp;')
		expect(html).toContain('loading="lazy"')
		expect(html).toContain(`src="${origin}/pieces/assets/fixture/cover%20small.jpg"`)
		const head = htmlHead(html)
		expect(head.match(/<title>/g)).toHaveLength(1)
		expect(head).toContain('<title>Icon page &lt;Piece>&amp;</title>')
		expect(head).toContain('name="icon-piece" content="&lt;Piece>&amp;"')
		expect(head).toContain('name="icon-piece" content="Related"')
		expect(head).toContain('.manual-icon-style')
		const iconClass = html.match(/class="prepared-icon (svelte-[a-z0-9]+)"/)?.[1]
		expect(iconClass).toBeDefined()
		expect(head.match(new RegExp(`id="${iconClass}"`, 'g'))).toHaveLength(1)
		expect(head).toContain('.default-icon.')
		expect(head).toContain('.icon-page.')
		const preview = await request('?job=icon%20job')
		expect(preview).toContain('src="/admin/preview/icon%20job/asset/fixture/cover%20small.jpg"')
		expect(preview).not.toContain(`src="${origin}/pieces/assets/fixture/cover%20small.jpg"`)
	})

	test('composes icons inside Open Graph templates without page-only helpers', async () => {
		const icon = `<script>let { data, options, helpers } = $props()</script>
<img class="og-icon" src={helpers.forPiece(data.piece).getImageUrl('cover', options.size.width, 'jpg')}
 alt={data.piece.title} data-icon-size={options.size.width + 'x' + options.size.height} />
<style>.og-icon { border-color: var(--color-primary); }</style>`
		const opengraph = `<script>let { data, options, helpers, components } = $props()</script>
<section id="opengraph" data-size={options.size.width + 'x' + options.size.height} data-page-control={typeof helpers.showNavBanner}>
<components.PieceIcon piece={data.piece} size={{ width: 125, height: 87 }} />
<components.PieceIcon piece={{ ...data.piece, type: 'unconfigured' }} size={{ width: 80 }} />
</section>`
		await publishSource(firstSource, '#135790', 'custom-kind', { 'custom-kind': icon }, opengraph)
		const html = await request('?role=opengraph')
		expect(html).toContain('id="opengraph" data-size="1200x630" data-page-control="undefined"')
		expect(html).toContain('data-icon-size="125x87"')
		expect(html).toContain('class="default-icon')
		expect(html).not.toContain('aria-label="Global"')
		expect(htmlHead(html)).toContain('.og-icon.')
		expect(htmlHead(html)).toContain('.default-icon.')
		const preview = await request('?role=opengraph&job=og%20job')
		expect(preview).toContain('src="/admin/preview/og%20job/asset/fixture/cover%20small.jpg"')
	})

	test('lets icon errors fall back at the page boundary and restores the next render', async () => {
		const source = `<script>let { data, helpers, components } = $props(); helpers.showNavBanner()</script>
<components.PieceIcon piece={data.piece} size={{ width: 80 }} />`
		await publishSource(source, '#135790', 'custom-kind', {
			'custom-kind': '<script>throw new Error("icon render failure")</script><p>Never shown</p>'
		})
		const html = await request()
		expect(html).toContain('Built-in presentation')
		expect(html).not.toContain('aria-label="Global"')
		expect(serverErrors).toContain('icon render failure')
		await publishSource(source, '#135790')
		const recovered = await request()
		expect(recovered).toContain('class="default-icon')
		expect(recovered).toContain('aria-label="Global"')
		expect(htmlHead(recovered)).not.toContain('Never shown')
	})

	test('leaves every compiled application file unchanged across publication and fallback', async () => {
		expect(await buildHashes()).toEqual(originalBuild)
	})
})
