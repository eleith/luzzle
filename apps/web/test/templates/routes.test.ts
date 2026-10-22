import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const webRoot = fileURLToPath(new URL('../../', import.meta.url))
const repository = path.resolve(webRoot, '../..')
const buildDirectory = path.join(webRoot, 'build')
const piecePath = '/pieces/cutover-kind/real-piece'
let directory: string
let configFilename: string
let preparedDirectory: string
let origin: string
let server: ChildProcess | undefined
let serverErrors = ''
let originalBuild: Record<string, string>
let childEnv: NodeJS.ProcessEnv

const startServer = `
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
const { server } = await import(pathToFileURL(process.argv[1]).href);
if (!server.server.listening) await once(server.server, 'listening');
process.send({ port: server.server.address().port });
`

// Seed through the real package in native Node, not Vitest's module/native SQLite environment.
const seedDatabase = `
import { pathToFileURL } from 'node:url';
const { createAppDb, runWebMigrations } = await import(pathToFileURL(process.argv[1]).href);
const db = createAppDb(process.argv[2]);
try {
  const migration = await runWebMigrations(db);
  if (migration.error) throw migration.error;
  const row = {
    id: 'cutover-id', key: 'cutover-key', slug: 'real-piece', type: 'cutover-kind',
    title: 'Real Piece', file_path: 'real-piece.cutover-kind.md', date_added: 1700000000000,
    note: 'Raw indexed note', summary: 'Published route description',
    json_metadata: JSON.stringify({ title: 'Real Piece', cover: 'cover-key', subtitle: 'Published metadata' })
  };
  await db.insertInto('web_pieces').values([
    row,
    { ...row, id: 'orphan-id', key: 'orphan-key', type: 'unconfigured-kind',
      file_path: 'orphan.unconfigured-kind.md', title: 'Orphan must not be visible' }
  ]).execute();
  const asset = {
    piece_file_path: row.file_path, piece_key: row.key, asset_key: 'cover-key',
    piece_asset_path: 'cover.png', is_embedded: 1
  };
  await db.insertInto('web_pieces_assets').values([
    { ...asset, transformation: 'image.s.png', asset_path: 'cutover/cover small.png',
      mime_type: 'image/png', is_embedded: 0 },
    { ...asset, transformation: 'palette', mime_type: 'application/json',
      content: JSON.stringify({ accent: '#123456', background: '#234567' }) },
    { ...asset, asset_key: row.key, piece_asset_path: row.file_path,
      transformation: 'markdown', mime_type: 'text/html', content: '<p>Published rendered note</p>' }
  ]).execute();
} finally {
  await db.destroy();
}
`

async function readOptional(filename: string) {
	try {
		return await readFile(filename)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
		throw error
	}
}

async function buildBlankApp() {
	const filenames = ['config.yaml', '.env'].map((name) => path.join(webRoot, name))
	const originals = await Promise.all(filenames.map(readOptional))
	// Never temporarily replace an owner's configuration, even if we could restore it later.
	for (const [index, bytes] of originals.entries()) {
		if (bytes?.toString('utf8').trim()) {
			throw new Error(
				`Real-app route tests require absent or blank ${filenames[index]}; refusing to overwrite owner configuration. Provide a blank CI checkout.`
			)
		}
	}
	try {
		// No owner source or type exists at build time: the Vite piece-type macro is [].
		await writeFile(filenames[0], JSON.stringify({ pieces: [] }))
		await writeFile(filenames[1], '')
		const { stdout, stderr } = await exec('pnpm', ['run', 'build'], {
			cwd: webRoot,
			env: childEnv,
			timeout: 110000,
			maxBuffer: 8 * 1024 * 1024
		})
		await writeFile(path.join(directory, 'app-build.log'), stdout + stderr)
	} finally {
		await Promise.all(
			filenames.map((filename, index) =>
				originals[index] === undefined
					? rm(filename, { force: true })
					: writeFile(filename, originals[index])
			)
		)
	}
}

async function buildHashes() {
	const hashes: Record<string, string> = {}
	for (const entry of await readdir(buildDirectory, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile()) continue
		const filename = path.join(entry.parentPath, entry.name)
		hashes[path.relative(buildDirectory, filename)] = createHash('sha256')
			.update(await readFile(filename))
			.digest('hex')
	}
	return hashes
}

async function request(pathname = piecePath, accept = 'text/html') {
	return fetch(`${origin}${pathname}`, {
		headers: { accept, 'x-forwarded-proto': 'http' },
		redirect: 'manual',
		signal: AbortSignal.timeout(10000)
	})
}

async function pageHtml() {
	const response = await request()
	expect(response.status).toBe(200)
	return response.text()
}

function htmlHead(html: string) {
	const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
	if (head === undefined) throw new Error('Expected the real app HTML head')
	return head
}

function expectAppSeo(html: string) {
	const head = htmlHead(html)
	expect(head.match(/<title>/g)).toHaveLength(1)
	expect(head).toContain('<title>Real Piece | Cutover Garden</title>')
	expect(head.match(/name="description"/g)).toHaveLength(1)
	expect(head).toContain('name="description" content="Published route description"')
	expect(head.match(/property="og:title"/g)).toHaveLength(1)
}

function expectBuiltIn(html: string) {
	expect(html).toContain('id="main-content"')
	expect(html).toContain('class="default-icon')
	expect(html).toMatch(/<h1(?:\s[^>]*)?>Real Piece<\/h1>/)
	expect(html).toContain('<p>Published rendered note</p>')
	expect(html.match(/aria-label="Global"/g)).toHaveLength(1)
	expect(html).toContain('href="/random"')
	expect(html).not.toContain('id="cutover-owner"')
	expect(html).not.toContain('data-prepared-theme')
	expect(html).not.toContain('--banner-background-color: #123456')
	expect(html).not.toContain(directory)
	expectAppSeo(html)
}

const iconSource = `<script>let { data, helpers } = $props()</script>
<a class="cutover-icon" href={helpers.forPiece(data.piece).getUrl()}>Prepared icon {data.piece.title}</a>
<style>.cutover-icon { color: var(--color-secondary); }</style>`

function ownerSource(label: string, navigation = true) {
	// Head ownership policy: only styles, not competing owner title/description tags.
	return `<script>
let { data, helpers, components } = $props();
const piece = helpers.forPiece(data.piece);
const palette = piece.getPalette();
${navigation ? 'helpers.showNavBanner({ background: palette?.accent });' : ''}
</script>
<main id="cutover-owner" class="cutover-page">
<h1>${label} {data.piece.title}</h1>
<p>{data.piece.metadata.subtitle}</p>
<a id="public-piece" href={piece.getUrl()}>Public piece</a>
<img id="public-cover" src={piece.getImageUrl(data.piece.metadata.cover, 125, 'png')} alt="Cover" />
<img id="site-mark" src={helpers.getStaticAssetUrl('images/favicon.png')} alt="Site mark" />
<p id="constructed-static-url">{helpers.getStaticAssetUrl('images/owner-only.svg')}</p>
{@html piece.getAssetContent(data.piece.key, 'markdown') ?? ''}
<components.PieceIcon piece={data.piece} size={{ width: 125 }} />
</main>
<style>.cutover-page { color: var(--color-primary); }</style>`
}

async function publishSource(source: string) {
	await writeFile(path.join(directory, 'owner-page.svelte'), source)
	await writeFile(path.join(directory, 'owner-icon.svelte'), iconSource)
	const { stdout } = await exec(
		process.execPath,
		[
			path.join(repository, 'packages/web/worker/dist/src/commands/publish-templates.js'),
			'--config',
			configFilename
		],
		{ cwd: directory, env: childEnv, timeout: 30000 }
	)
	return JSON.parse(stdout) as { revision: string }
}

async function startBuiltApp(): Promise<string> {
	const child = spawn(
		process.execPath,
		['--input-type=module', '-e', startServer, path.join(buildDirectory, 'index.js')],
		{
			cwd: directory,
			env: {
				...childEnv,
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
			() => reject(new Error(`App startup timed out: ${serverErrors}`)),
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
			else reject(new Error('Invalid app server startup message'))
		})
		child.once('error', (error) => {
			clearTimeout(timeout)
			reject(error)
		})
		child.once('exit', (code) => {
			clearTimeout(timeout)
			reject(new Error(`App server exited (${code}): ${serverErrors}`))
		})
	})
	return `http://127.0.0.1:${port}`
}

beforeAll(async () => {
	const cache = path.join(webRoot, 'node_modules/.cache')
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'template-routes-'))
	// Keep package-manager reads/writes inside the ignored test directory, not ~/.npmrc.
	const npmUserConfig = path.join(directory, 'user.npmrc')
	const npmGlobalConfig = path.join(directory, 'global.npmrc')
	await Promise.all([writeFile(npmUserConfig, ''), writeFile(npmGlobalConfig, '')])
	childEnv = {
		...process.env,
		NODE_ENV: 'production',
		NPM_CONFIG_USERCONFIG: npmUserConfig,
		NPM_CONFIG_GLOBALCONFIG: npmGlobalConfig,
		npm_config_userconfig: npmUserConfig,
		npm_config_globalconfig: npmGlobalConfig,
		NPM_CONFIG_CACHE: path.join(directory, 'npm-cache'),
		npm_config_cache: path.join(directory, 'npm-cache')
	}
	await buildBlankApp()
	originalBuild = await buildHashes()
	expect(Object.keys(originalBuild).length).toBeGreaterThan(0)

	// This arbitrary type and its not-yet-created owner sources are configured only after build.
	configFilename = path.join(directory, 'config.yaml')
	preparedDirectory = path.join(directory, 'prepared')
	await writeFile(
		configFilename,
		JSON.stringify({
			url: { app: '' },
			paths: {
				database: path.join(directory, 'luzzle.sqlite'),
				prepared: './prepared',
				static: path.join(directory, 'owner-static')
			},
			content: { text: { title: 'Cutover Garden' } },
			pieces: [
				{
					type: 'cutover-kind',
					fields: { title: 'title', date_consumed: 'date' },
					components: { page: './owner-page.svelte', icon: './owner-icon.svelte' }
				}
			],
			theme: { light: { 'color-primary': '#135790' } }
		})
	)
	await mkdir(path.join(directory, 'owner-static/images'), { recursive: true })
	await writeFile(
		path.join(directory, 'owner-static/images/owner-only.svg'),
		'<svg xmlns="http://www.w3.org/2000/svg"></svg>'
	)
	await mkdir(path.join(directory, 'assets/pieces/cutover'), { recursive: true })
	await writeFile(
		path.join(directory, 'assets/pieces/cutover/cover small.png'),
		await readFile(path.join(webRoot, 'static/images/favicon.png'))
	)
	await exec(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			seedDatabase,
			path.join(repository, 'packages/web/db/dist/src/index.js'),
			path.join(directory, 'luzzle.sqlite')
		],
		{ cwd: directory, env: childEnv, timeout: 10000 }
	)
	origin = await startBuiltApp()
}, 120000)

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

describe('prepared pages through the production app HTTP routes', () => {
	test('uses the real default page and public catalog for types configured only after build', async () => {
		const html = await pageHtml()
		expectBuiltIn(html)
		expect(html).toContain('pieceTypes:["cutover-kind"]')
	})

	test('serves runtime-filtered listings and typed/untyped feeds without a compiled type matcher', async () => {
		for (const pathname of [
			'/pieces/cutover-kind',
			'/rss/pieces/cutover-kind/feed.html',
			'/rss/pieces/cutover-kind/feed.md'
		]) {
			const response = await request(pathname)
			expect(response.status, pathname).toBe(200)
			const html = await response.text()
			expect(html).toContain('Real Piece')
			expect(html).not.toContain('Orphan must not be visible')
		}
		for (const pathname of ['/pieces', '/rss/pieces/feed.html', '/rss/pieces/feed.md']) {
			const response = await request(pathname)
			expect(response.status, pathname).toBe(200)
			expect(await response.text()).toContain('Real Piece')
		}
	})

	test('keeps unknown type filters and rejected feed formats out of listing/feed handlers', async () => {
		for (const pathname of [
			'/pieces/unconfigured-kind',
			'/rss/pieces/unconfigured-kind/feed.html',
			'/rss/pieces/unconfigured-kind/feed.md',
			'/rss/pieces/cutover-kind/feed.invalid'
		]) {
			const response = await request(pathname)
			expect(response.status, pathname).toBe(404)
			expect(await response.text()).not.toContain('Orphan must not be visible')
		}
	})

	test('uses the runtime type authority for API filters while preserving the invalid-type status', async () => {
		const response = await request('/api/pieces?type=cutover-kind', 'application/json')
		expect(response.status).toBe(200)
		const result = await response.json()
		expect(result.pieces).toHaveLength(1)
		expect(result.pieces[0]).toMatchObject({ title: 'Real Piece', type: 'cutover-kind' })
		const invalid = await request('/api/pieces?type=unconfigured-kind', 'application/json')
		expect(invalid.status).toBe(400)
		expect(await invalid.text()).toBe('invalid type')
	})

	test('404s an unknown type even with a matching orphan row, and a missing slug', async () => {
		for (const pathname of [
			'/pieces/unconfigured-kind/real-piece',
			'/pieces/cutover-kind/missing'
		]) {
			const response = await request(pathname)
			expect(response.status).toBe(404)
			expect(await response.text()).not.toContain('Orphan must not be visible')
		}
	})

	test('publishes late owner content, helpers, icon, navigation and CSS without rebuilding', async () => {
		await publishSource(ownerSource('First prepared'))
		const html = await pageHtml()
		expect(html).toContain('<h1>First prepared Real Piece</h1>')
		expect(html).toContain('Published metadata')
		expect(html).toContain('<p>Published rendered note</p>')
		expect(html).not.toContain('Raw indexed note</')
		expect(html).toContain(`href="${origin}${piecePath}"`)
		expect(html).toContain('src="/pieces/assets/cutover/cover%20small.png"')
		expect(html).not.toContain('/admin/preview/')
		expect(html).toContain('src="/images/favicon.png"')
		expect(html).toContain('<p id="constructed-static-url">/images/owner-only.svg</p>')
		expect((await request('/images/owner-only.svg')).status).toBe(404)
		expect(html).toContain('Prepared icon Real Piece')
		expect(html.match(/aria-label="Global"/g)).toHaveLength(1)
		expect(html).toContain('--banner-background-color: #123456')
		expect(html).not.toContain('href="/random"')
		expect(html.indexOf('aria-label="Global"')).toBeLessThan(html.indexOf('id="cutover-owner"'))
		const scopedClass = html.match(/class="cutover-page (svelte-[a-z0-9]+)"/)?.[1]
		expect(scopedClass).toBeDefined()
		const head = htmlHead(html)
		expect(head).toContain(`.cutover-page.${scopedClass}`)
		expect(head).toContain('.cutover-icon.')
		expect(head).toContain('var(--color-primary)')
		expect(head).toContain('data-prepared-theme')
		expect(head).toContain('--color-primary: #135790;')
		expectAppSeo(html)
		for (const pathname of ['/images/favicon.png', '/pieces/assets/cutover/cover%20small.png']) {
			const response = await request(pathname)
			expect(response.status).toBe(200)
			expect(response.headers.get('content-type')).toContain('image/png')
			expect(Buffer.from(await response.arrayBuffer())).toEqual(
				await readFile(path.join(webRoot, 'static/images/favicon.png'))
			)
		}
	})

	test('retains the selected real page when Svelte preparation fails', async () => {
		const pointer = await readFile(path.join(preparedDirectory, 'current.json'), 'utf8')
		await expect(publishSource('<div>')).rejects.toMatchObject({ code: 1 })
		expect(await readFile(path.join(preparedDirectory, 'current.json'), 'utf8')).toBe(pointer)
		expect(await pageHtml()).toContain('<h1>First prepared Real Piece</h1>')
	})

	test('falls back atomically when a valid published template throws after requesting navigation', async () => {
		await publishSource(`<script>let { helpers } = $props();
helpers.showNavBanner({ background: '#123456' }); throw new Error('cutover owner render failure');
</script><main id="cutover-owner">Never visible</main>
<style>#cutover-owner { color: #abcdef; }</style>`)
		const html = await pageHtml()
		expectBuiltIn(html)
		expect(htmlHead(html)).not.toContain('#abcdef')
		expect(html).not.toContain('cutover owner render failure')
		expect(serverErrors).toContain('cutover owner render failure')
	})

	test('falls back for incompatible module exports without leaking server paths', async () => {
		const published = await publishSource(ownerSource('Invalid module'))
		await writeFile(
			path.join(preparedDirectory, 'revisions', published.revision, 'templates.mjs'),
			'export const wrong = true;'
		)
		const html = await pageHtml()
		expectBuiltIn(html)
		expect(html).not.toContain('Invalid prepared template exports')
		expect(serverErrors).toContain('Invalid prepared template exports')
	})

	test('selects a repaired revision on the next real request without app restart or rebuild', async () => {
		await publishSource(ownerSource('Repaired prepared'))
		const html = await pageHtml()
		expect(html).toContain('<h1>Repaired prepared Real Piece</h1>')
		expect(html).not.toContain('First prepared Real Piece')
		expect(html).not.toContain('id="main-content"')
		expectAppSeo(html)
	})

	test('omits the banner when a prepared page does not request one', async () => {
		await publishSource(ownerSource('Without banner', false))
		const html = await pageHtml()
		expect(html).toContain('<h1>Without banner Real Piece</h1>')
		expect(html).not.toContain('aria-label="Global"')
		expectAppSeo(html)
	})

	// Anonymous hook-boundary checks, not authenticated preview rendering coverage.
	// Existing thrown redirects omit event.setHeaders; JSON denials retain no-store.
	// Redirect header hardening is separate from this rendering cutover.
	test('preserves anonymous redirects and private JSON denials for admin page routes', async () => {
		for (const pathname of [
			'/admin/piece/real-piece.cutover-kind.md/published/page',
			'/admin/piece/real-piece.cutover-kind.md/preview/selected-job/page',
			'/admin/open/cutover-kind/real-piece',
			'/admin/open/unconfigured-kind/real-piece'
		]) {
			const browser = await request(pathname)
			expect(browser.status).toBe(302)
			expect(browser.headers.get('location')).toBe('/')
			expect(await browser.text()).not.toContain('cutover-owner')
			const api = await request(pathname, 'application/json')
			expect(api.status).toBe(403)
			expect(api.headers.get('cache-control')).toBe('private, no-store')
			expect(await api.text()).not.toContain('cutover-owner')
		}
	})

	test('leaves every adapter build file byte-for-byte unchanged', async () => {
		expect(await buildHashes()).toEqual(originalBuild)
	})
})
