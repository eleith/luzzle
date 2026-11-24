import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { resolveAuthUrl } from '../../scripts/runtime-environment.js'

const exec = promisify(execFile)
const webRoot = fileURLToPath(new URL('../../', import.meta.url))
const repository = path.resolve(webRoot, '../..')
const buildDirectory = path.join(webRoot, 'build')
const piecePath = '/pieces/cutover-kind/real-piece'
const feedCases = [
	{
		folder: '/rss/pieces/cutover-kind',
		type: 'piece',
		label: 'cutover-kind',
		title: 'RSS feed | cutover-kind',
		description: 'an RSS feed for cutover-kind',
		discoveryTitle: 'RSS feed for cutover-kind',
		count: 1
	},
	{
		folder: '/rss/pieces',
		type: 'piece',
		label: 'all',
		title: 'RSS feed | all',
		description: 'RSS feed for all pieces',
		discoveryTitle: 'RSS feed',
		count: 2
	},
	{
		folder: '/rss/tags/field-notes',
		type: 'tag',
		label: 'field-notes',
		title: 'RSS feed | tag: field-notes',
		description: 'an RSS feed for pieces tagged with field-notes',
		discoveryTitle: 'RSS feed for tag: field-notes',
		count: 1
	},
	{
		folder: '/rss/tags/missing-tag',
		type: 'tag',
		label: 'missing-tag',
		title: 'RSS feed | tag: missing-tag',
		description: 'an RSS feed for pieces tagged with missing-tag',
		discoveryTitle: 'RSS feed for tag: missing-tag',
		count: 0
	}
] as const

type FeedCase = (typeof feedCases)[number]
type MachineFeeds = Record<string, { contentType: string | null; body: string }>
let directory: string
let configFilename: string
let origin: string
let server: ChildProcess | undefined
let serverErrors = ''
let nativeShutdownObserved = false
let originalMachineFeeds: MachineFeeds
let originalPublicPiece: unknown
let childEnv: NodeJS.ProcessEnv

// Keep argv[1] as the built entry so importing the bootstrap does not trigger its CLI guard.
const startServer = `
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
const { startServer } = await import(pathToFileURL(process.argv[2]).href);
const server = await startServer(process.argv[1]);
process.once('sveltekit:shutdown', () => process.send({ nativeShutdown: true }));
if (!server.listening) await once(server, 'listening');
process.send({ port: server.address().port });
`

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
    date_consumed: 1700000000000, note: 'Raw indexed note', summary: 'Published route description',
    json_metadata: JSON.stringify({ title: 'Real Piece', cover: 'cover-key', subtitle: 'Published metadata',
      artwork: 'cover-key', released: '2001-09-09', minutes: 123, genre: 'Native catalog',
      filmmaker: 'Ada Example', website: 'https://example.com/real-piece', isbn: '9780000000001', creators: [{ name: 'Ada Example' }] })
  };
  await db.insertInto('web_pieces').values([
    row,
    { ...row, id: 'orphan-id', key: 'orphan-key', type: 'unconfigured-kind',
      file_path: 'orphan.unconfigured-kind.md', title: 'Orphan must not be visible' }
  ]).execute();
  await db.insertInto('web_pieces_tags').values({ piece_type: row.type, piece_slug: row.slug, piece_id: row.id, tag: 'Field Notes', slug: 'field-notes' }).execute();
  const asset = { piece_file_path: row.file_path, piece_key: row.key, asset_key: 'cover-key', piece_asset_path: 'cover.png', is_embedded: 1 };
  await db.insertInto('web_pieces_assets').values([
    { ...asset, transformation: 'image.s.jpg', asset_path: 'cutover/cover small.png', mime_type: 'image/png', is_embedded: 0 },
    { ...asset, transformation: 'image.s.png', asset_path: 'cutover/cover small.png', mime_type: 'image/png', is_embedded: 0 },
    { ...asset, asset_key: row.key, transformation: 'opengraph', asset_path: 'cutover/share.png', mime_type: 'image/png', is_embedded: 0 },
    { ...asset, asset_key: row.key, piece_asset_path: row.file_path, transformation: 'markdown', mime_type: 'text/html', content: '<p>Published rendered note</p>' }
  ]).execute();
} finally { await db.destroy(); }
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
	for (const [index, bytes] of originals.entries()) {
		if (bytes?.toString('utf8').trim())
			throw new Error(
				`Real-app route tests require absent or blank ${filenames[index]}; refusing to overwrite owner configuration.`
			)
	}
	try {
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

async function request(pathname = piecePath, accept = 'text/html', init: RequestInit = {}) {
	const headers = new Headers(init.headers)
	headers.set('accept', accept)
	if (!headers.has('x-forwarded-proto')) headers.set('x-forwarded-proto', 'http')
	return fetch(`${origin}${pathname}`, {
		...init,
		headers,
		redirect: 'manual',
		signal: AbortSignal.timeout(10000)
	})
}
async function pageHtml(pathname = piecePath) {
	const response = await request(pathname)
	expect(response.status).toBe(200)
	return response.text()
}
async function expectSiteAssetResponse(
	endpoint: string,
	bytes: Buffer,
	contentType: string,
	previousEtag?: string
): Promise<string> {
	const etag = `"${createHash('sha256').update(bytes).digest('base64url')}"`
	for (const method of ['GET', 'HEAD']) {
		const response = await request(endpoint, 'image/*', {
			method,
			headers: { 'accept-encoding': 'br, gzip', range: 'bytes=0-1' }
		})
		expect(response.status).toBe(200)
		expect(response.headers.get('content-length')).toBe(String(bytes.length))
		expect(response.headers.get('content-type')).toBe(contentType)
		expect(response.headers.get('etag')).toBe(etag)
		expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
		expect(response.headers.has('content-encoding')).toBe(false)
		expect(Buffer.from(await response.arrayBuffer())).toEqual(
			method === 'HEAD' ? Buffer.alloc(0) : bytes
		)
	}
	const conditional = await request(endpoint, 'image/*', {
		headers: { 'if-none-match': `W/${etag}` }
	})
	expect(conditional.status).toBe(304)
	expect(await conditional.text()).toBe('')
	if (previousEtag && previousEtag !== etag) {
		const stale = await request(endpoint, 'image/*', {
			headers: { 'if-none-match': previousEtag }
		})
		expect(stale.status).toBe(200)
		expect(Buffer.from(await stale.arrayBuffer())).toEqual(bytes)
	}
	return etag
}

function linkTargets(html: string, pathname: string) {
	const pageUrl = new URL(pathname, origin)
	return Array.from(
		html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g),
		([, href]) => new URL(href.replaceAll('&amp;', '&'), pageUrl).href
	)
}

function htmlHead(html: string) {
	const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
	if (head === undefined) throw new Error('Expected the real app HTML head')
	return head
}

function expectRuntimeCsp(response: Response, html: string, appAssets = '', pieceAssets = '') {
	const header = response.headers.get('content-security-policy')
	if (!header) throw new Error('Expected the framework-generated CSP')
	// Fetch combines repeated headers with commas: there must be only one policy.
	expect(header).not.toContain(',')
	const directives: Record<string, string[]> = {}
	for (const directive of header
		.split(';')
		.map((value) => value.trim())
		.filter(Boolean)) {
		const [name, ...sources] = directive.split(/\s+/)
		expect(directives, `duplicate CSP directive: ${name}`).not.toHaveProperty(name)
		directives[name] = sources.sort()
	}
	const bootstrap = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(
		([, , script]) => script.includes('import(') && script.includes('/_app/immutable/')
	)
	if (!bootstrap) throw new Error('Expected the framework bootstrap script')
	const nonce = bootstrap[1].match(/\bnonce="([^"]+)"/)?.[1]
	expect(nonce).toBeTruthy()
	const appSources = appAssets ? [`${appAssets.replace(/\/+$/, '')}/`] : []
	const pieceSources = pieceAssets ? [`${pieceAssets.replace(/\/+$/, '')}/`] : []
	const expected: Record<string, string[]> = {
		'default-src': ["'self'"],
		'script-src': [
			"'self'",
			"'unsafe-hashes'",
			"'sha256-7dQwUgLau1NFCCGjfn9FsYptB6ZtWxJin6VohGIu20I='",
			"'sha256-8oa0zHl7YAxAhiYNg8fadxmsU54ezUB+oZ/NjM03xVk='",
			`'nonce-${nonce}'`,
			...appSources
		],
		'style-src': ["'self'", "'unsafe-inline'", ...appSources],
		'img-src': ["'self'", 'data:', ...appSources, ...pieceSources],
		'connect-src': ["'self'"],
		'font-src': ["'self'", ...appSources],
		'object-src': ["'none'"],
		'base-uri': ["'self'"],
		'frame-ancestors': ["'none'"]
	}
	for (const sources of Object.values(expected)) sources.sort()
	// Exact lists also forbid piece-CDN script/style/font access or relaxed restrictions.
	expect(directives).toEqual(expected)
}

function expectSameOriginFrameworkUrls(html: string, requestOrigin: string) {
	const urls = [
		...html.matchAll(/\b(?:href|src)=["']([^"']*\/_app\/immutable\/[^"']+)["']/g),
		...html.matchAll(/\bimport\(["']([^"']*\/_app\/immutable\/[^"']+)["']\)/g)
	].map(([, url]) => url)
	expect(urls.some((url) => url.endsWith('.js'))).toBe(true)
	expect(urls.some((url) => url.endsWith('.css'))).toBe(true)
	for (const url of urls) {
		expect(url).not.toMatch(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i)
		expect(new URL(url, `${requestOrigin}${piecePath}`).origin).toBe(requestOrigin)
	}
}

function stablePageHeaders(response: Response) {
	// Body/nonce changes affect validators and size; Date belongs to the Node transport.
	const variable = new Set(['content-security-policy', 'etag', 'content-length', 'date'])
	return Object.fromEntries([...response.headers].filter(([name]) => !variable.has(name)))
}

function expectFeedSeo(html: string, feed: FeedCase) {
	const head = htmlHead(html)
	expect(head.match(/<title>/g)).toHaveLength(1)
	expect(head).toContain(`<title>${feed.title}</title>`)
	expect(head.match(/name="description"/g)).toHaveLength(1)
	expect(head).toContain(`name="description" content="${feed.description}"`)
	expect(head.match(/property="og:title"/g)).toHaveLength(1)
	expect(head).toContain(`property="og:title" content="${feed.title}"`)
	const preferenceScripts = (head.match(/<script\b[^>]*>[\s\S]*?<\/script>/g) ?? []).filter(
		(script) => script.includes('window.localStorage.getItem')
	)
	expect(preferenceScripts).toHaveLength(1)
	expect(preferenceScripts[0]).toContain('data-theme-preference')
	expect(preferenceScripts[0]).toContain('prefers-color-scheme: dark')
	const discovery = head.match(/<link\b[^>]*type="application\/rss\+xml"[^>]*>/g) ?? []
	expect(discovery).toHaveLength(1)
	expect(discovery[0]).toContain(`title="${feed.discoveryTitle}"`)
	expect(discovery[0]).toContain(`href="${feed.folder}/feed.xml"`)
}

function expectNativeFeed(html: string, feed: FeedCase, about: boolean, links: boolean) {
	expectFeedSeo(html, feed)
	expect(html.match(/aria-label="Global"/g)).toHaveLength(1)
	for (const label of ['main page', 'search', 'change theme', 'random'])
		expect(html).toContain(`aria-label="${label}"`)
	const targets = linkTargets(html, `${feed.folder}/feed.html`)
	for (const pathname of ['/', '/search', '/random'])
		expect(targets).toContain(new URL(pathname, origin).href)
	expect(html).toContain('id="default-feed"')
	expect(html.match(/class="item-card\b/g) ?? []).toHaveLength(feed.count)
	const title = feed.type === 'tag' ? `tag: ${feed.label}` : feed.label
	expect(html).toMatch(new RegExp(`<h1[^>]*>RSS feed for ${title}</h1>`))
	expect(html.includes('aria-label="About this feed"')).toBe(about)
	expect(html.includes('aria-label="RSS subscription"')).toBe(links)
	if (links) {
		for (const [format, label] of [
			['xml', 'XML'],
			['json', 'JSON'],
			['md', 'Markdown']
		])
			expect(html).toContain(`href="feed.${format}" rel="external">${label}</a>`)
		expect(html).toContain('aria-label="RSS feed URL"')
		expect(html).toContain('aria-describedby="rss-instructions"')
		expect(html).toMatch(/\breadonly(?:\s|=|>)/)
		expect(html).toContain(`value="${feed.folder}/feed.xml"`)
		expect(html).toContain('copy</button>')
	} else expect(html).not.toContain('aria-label="RSS feed URL"')
	if (feed.count) {
		expect(targets).toContain(new URL(piecePath, origin).href)
		expect(html).toContain('Raw indexed note')
		expect(html).toContain('Nov 14, 2023')
	}
	expect(html.includes('Orphan must not be visible')).toBe(feed.label === 'all')
	expect(html).not.toContain('data-prepared-theme')
	expect(html).not.toContain('/admin/preview/')
	expect(html).not.toContain(directory)
}

async function machineFeedSnapshot(): Promise<MachineFeeds> {
	const snapshot: MachineFeeds = {}
	for (const feed of feedCases) {
		for (const [format, contentType] of [
			['xml', 'application/xml'],
			['json', 'application/json'],
			['md', 'text/markdown']
		]) {
			const pathname = `${feed.folder}/feed.${format}`
			const response = await request(pathname, contentType)
			expect(response.status, pathname).toBe(200)
			expect(response.headers.get('content-type')).toContain(contentType)
			const body = await response.text()
			expect(body).toContain('Cutover Garden')
			expect(body.includes('Real Piece')).toBe(feed.count > 0)
			expect(body.includes('Orphan must not be visible')).toBe(feed.label === 'all')
			if (feed.count) {
				expect(body).toContain(piecePath)
				expect(body).toContain('Raw indexed note')
			}
			if (format === 'json') {
				const decoded = JSON.parse(body)
				const json = typeof decoded === 'string' ? JSON.parse(decoded) : decoded
				expect(json.title).toBe(
					feed.type === 'tag' ? `Cutover Garden | tag: ${feed.label}` : 'Cutover Garden'
				)
				expect(json.language).toBe('en')
				expect(json.items ?? []).toHaveLength(feed.count)
			}
			snapshot[pathname] = {
				contentType: response.headers.get('content-type'),
				body: body
					.replace(
						/<lastBuildDate>[^<]*<\/lastBuildDate>/g,
						'<lastBuildDate>REQUEST_TIME</lastBuildDate>'
					)
					.replace(/^lastBuildDate:.*$/m, 'lastBuildDate: REQUEST_TIME')
					.replaceAll(origin, 'REQUEST_ORIGIN')
			}
		}
	}
	return snapshot
}

function expectBuiltIn(html: string) {
	expect(html).toContain('class="poster')
	expect(html).toMatch(/<h1(?:\s[^>]*)?>Real Piece<\/h1>/)
	expect(html).toContain('<p>Published rendered note</p>')
	expect(html.match(/aria-label="Global"/g)).toHaveLength(1)
	expect(html).not.toContain('data-prepared-theme')
	expect(html).not.toContain(directory)
	const head = htmlHead(html)
	expect(head.match(/<title>/g)).toHaveLength(1)
	expect(head).toContain('<title>Real Piece | Cutover Garden</title>')
	expect(head).toContain('name="description" content="Published route description"')
	expect(head).toContain('property="og:image" content="/pieces/assets/cutover/share.png"')
}

async function stopBuiltApp() {
	if (!server || server.exitCode !== null || server.signalCode !== null) return
	const exited = once(server, 'exit')
	server.kill('SIGTERM')
	const timeout = setTimeout(() => server?.kill('SIGKILL'), 5000)
	try {
		const [, signal] = await exited
		expect(signal).not.toBe('SIGKILL')
		expect(nativeShutdownObserved).toBe(true)
	} finally {
		clearTimeout(timeout)
	}
}

async function startBuiltApp(envOverrides: NodeJS.ProcessEnv = {}): Promise<string> {
	const child = spawn(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			startServer,
			path.join(buildDirectory, 'index.js'),
			path.join(webRoot, 'scripts/start-server.js')
		],
		{
			cwd: directory,
			env: {
				...childEnv,
				HOST: '127.0.0.1',
				PORT: '0',
				PROTOCOL_HEADER: 'x-forwarded-proto',
				SOCKET_PATH: '',
				LISTEN_PID: '0',
				LISTEN_FDS: '0',
				...envOverrides
			},
			stdio: ['ignore', 'ignore', 'pipe', 'ipc']
		}
	)
	server = child
	nativeShutdownObserved = false
	child.on('message', (message) => {
		if (typeof message === 'object' && message !== null && 'nativeShutdown' in message) {
			nativeShutdownObserved = message.nativeShutdown === true
		}
	})
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

async function restartWithPages(pages: object) {
	await stopBuiltApp()
	const config = JSON.parse(await readFile(configFilename, 'utf8'))
	config.pages = pages
	await writeFile(configFilename, JSON.stringify(config))
	origin = await startBuiltApp()
}

beforeAll(async () => {
	const cache = path.join(webRoot, 'node_modules/.cache')
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'site-routes-'))
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
	configFilename = path.join(directory, 'config.yaml')
	await writeFile(
		configFilename,
		JSON.stringify({
			url: { app: '' },
			network: { public: { host: '127.0.0.1' } },
			paths: {
				database: path.join(directory, 'luzzle.sqlite'),
				static: path.join(directory, 'owner-static')
			},
			content: { text: { title: 'Cutover Garden' } },
			pieces: [
				{
					type: 'cutover-kind',
					fields: { title: 'title', date_consumed: 'date' },
					templates: {
						icon: { name: 'default', mapping: { image: 'artwork' } },
						page: {
							name: 'default',
							mapping: {
								image: 'artwork',
								dateReleased: 'released',
								runtime: 'minutes',
								category: 'genre',
								url: 'website',
								isbn: 'isbn',
								people: 'creators'
							}
						},
						opengraph: {
							name: 'default',
							mapping: {
								image: 'artwork',
								director: 'filmmaker',
								dateReleased: 'released',
								runtime: 'minutes'
							}
						}
					}
				}
			],
			theme: { light: { 'color-primary': '#135790' }, globals: {} }
		})
	)
	await mkdir(path.join(directory, 'sections'), { recursive: true })
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
		await stopBuiltApp()
	} finally {
		if (directory) await rm(directory, { recursive: true, force: true })
	}
})

describe('stock pieces and configured site sections through production HTTP', () => {
	test('production rejects a missing launcher map instead of silently using build-time routing', async () => {
		const environment = { ...childEnv }
		delete environment.LUZZLE_PAGE_TEMPLATES
		delete environment.LUZZLE_ICON_TEMPLATES
		await expect(
			exec(
				process.execPath,
				[
					'--input-type=module',
					'-e',
					"import { pathToFileURL } from 'node:url'; await import(pathToFileURL(process.argv[1]).href)",
					path.join(buildDirectory, 'handler.js')
				],
				{ cwd: directory, env: environment, timeout: 10000 }
			)
		).rejects.toMatchObject({
			code: 1,
			stderr: expect.stringContaining('Missing routing configuration')
		})
	})

	test('YAML remaps page and icon templates after restart without rebuilding or changing public URLs', async () => {
		const listing = '/pieces/cutover-kind?year=2023&page=1'
		const rendered = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
		const before = rendered(await pageHtml())
		expect(before).toContain('123 min')
		expect(before).toContain('src="/pieces/assets/cutover/cover%20small.png"')
		expect(rendered(await pageHtml(listing))).toMatch(/class="poster\b/)
		const original = await readFile(configFilename)
		try {
			const config = JSON.parse(original.toString('utf8'))
			config.pieces[0].templates.page = { name: 'note' }
			config.pieces[0].templates.icon.name = 'recipe-card'
			await writeFile(configFilename, JSON.stringify(config))
			// Configuration is restart-bound; this server still renders the original selection.
			expect(rendered(await pageHtml())).toContain('123 min')
			await stopBuiltApp()
			// Reuse the already built application, without invoking the compiler again.
			origin = await startBuiltApp()
			const page = rendered(await pageHtml())
			expect(page).toMatch(/<h1[^>]*>Real Piece<\/h1>/)
			expect(page).toContain('<p>Published rendered note</p>')
			expect(page).not.toContain('123 min')
			expect(page).not.toContain('<img')
			const icons = rendered(await pageHtml(listing))
			expect(icons).toMatch(/class="recipe-card\b/)
			expect(icons).toContain('src="/pieces/assets/cutover/cover%20small.png"')
			expect(linkTargets(icons, listing)).toContain(new URL(piecePath, origin).href)

			for (const pathname of [
				'/templates/page/note/cutover-kind/real-piece?keep=1',
				'/%74emplates/%70age/book/cutover-kind/real-piece?keep=1'
			]) {
				const internal = await request(pathname)
				expect(internal.status).toBe(307)
				expect(internal.headers.get('location')).toBe(`${piecePath}?keep=1`)
			}
			// Unselected and encoded internal routes also canonicalize before rendering.
			for (const pathname of [
				'/templates/icon/recipe-card/cutover-kind?year=2023&page=2',
				'/templates/icon/book/cutover-kind?year=2023&page=2',
				'/%74emplates/%69con/book/cutover-kind?year=2023&page=2'
			]) {
				const internal = await request(pathname)
				expect(internal.status).toBe(307)
				expect(internal.headers.get('location')).toBe('/pieces/cutover-kind?year=2023&page=2')
			}
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	}, 30000)

	test('external icons and pages render from templates prepared at startup', async () => {
		const original = await readFile(configFilename)
		const filename = path.join(directory, 'owner-icon.svelte')
		try {
			await stopBuiltApp()
			await writeFile(
				filename,
				`<script>let { fields } = $props();</script><b data-owner-icon>{fields.caption}</b><style>b { color: teal }</style>`
			)
			const config = JSON.parse(original.toString('utf8'))
			config.pieces[0].templates.icon = {
				file: './owner-icon.svelte',
				mapping: { caption: 'subtitle' }
			}
			const pageFile = path.join(directory, 'owner-page.svelte')
			await writeFile(
				pageFile,
				`<script>
					let { piece } = $props()
					if (piece.type === 'unconfigured-kind') throw new Error('Private rendering failure')
				</script><h1 data-owner-page>{piece.title}</h1>`
			)
			config.pieces[0].templates.page.file = './owner-page.svelte'
			// Reuse the second seeded record to exercise a per-record template failure.
			config.pieces.push({ ...config.pieces[0], type: 'unconfigured-kind' })
			config.pages = { ...config.pages, home: { latest: false, random: true } }
			await writeFile(configFilename, JSON.stringify(config))
			origin = await startBuiltApp()
			// Production must serve the prepared design even if its source is no longer present.
			await Promise.all([rm(filename), rm(pageFile)])
			const detail = await pageHtml(piecePath)
			expect(detail).toMatch(/<h1\b[^>]*data-owner-page[^>]*>Real Piece<\/h1>/)
			expect(detail).not.toContain('aria-label="Global"')
			const failed = await request('/pieces/unconfigured-kind/real-piece')
			expect(failed.status).toBe(500)
			const errorPage = await failed.text()
			expect(errorPage).toContain('error 500')
			expect(errorPage).not.toContain('Private rendering failure')
			const api = await request('/api/pieces?type=cutover-kind', 'application/json')
			expect(api.status).toBe(200)
			for (const body of [detail, errorPage, await api.text()]) {
				expect(body).not.toContain(directory)
				expect(body).not.toContain('owner-page.svelte')
			}
			const listing = await pageHtml('/pieces/cutover-kind')
			const markup = listing.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
			expect(markup).toMatch(/<b\b[^>]*data-owner-icon[^>]*>Published metadata<\/b>/)
			expect(markup).toMatch(/<style\b[^>]*>[^<]*color:\s*teal/)
			expect(listing).not.toContain('owner-icon.svelte')
			const home = (await pageHtml('/')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
			expect(home).toMatch(
				/<h2[^>]*>random<\/h2>[\s\S]*?<b\b[^>]*data-owner-icon[^>]*>Published metadata<\/b>/
			)
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	}, 30000)

	test('shows the native search form only without filters and keeps filtered pages results-only', async () => {
		async function searchHtml(pathname: string) {
			// Ignore Svelte's SSR branch markers when asserting visible heading text.
			return (await pageHtml(pathname)).replace(/<!--[\s\S]*?-->/g, '')
		}
		function searchForm(html: string, pathname: string) {
			expect(html.match(/<main\b/g)).toHaveLength(1)
			expect(html.match(/<h1\b[^>]*>Search<\/h1>/g)).toHaveLength(1)
			const forms = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)]
			expect(forms).toHaveLength(1)
			const [, attributes, body] = forms[0]
			expect(attributes).toMatch(/\bmethod="get"/i)
			const action = attributes.match(/\baction="([^"]+)"/)?.[1]
			expect(action).toBeDefined()
			const url = new URL(action!.replaceAll('&amp;', '&'), new URL(pathname, origin))
			expect(url.href).toBe(new URL('/search', origin).href)
			const controls = [...body.matchAll(/<input\b[^>]*\bname="([^"]+)"[^>]*>/g)]
			expect(controls.map(([, name]) => name).sort()).toEqual(['after', 'before', 'query', 'type'])
			const params = new URLSearchParams()
			for (const [tag, name] of controls) {
				expect(tag).not.toMatch(/\sdisabled(?:\s|=|>)/)
				const value = tag.match(/\bvalue="([^"]*)"/)?.[1]
				expect(value, name).toBeDefined()
				params.set(name, value!.replaceAll('&amp;', '&'))
				if (name === 'after' || name === 'before') expect(tag).toContain('type="hidden"')
			}
			expect(body).toMatch(/<input\b(?=[^>]*\bname="query")(?=[^>]*\btype="search")[^>]*>/)
			expect(body).toMatch(/<button\b[^>]*\btype="submit"/)
			expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('<form'))
			expect(html).not.toContain('id="search-results-title"')
			expect(html).not.toContain('Real Piece')
			expect(linkTargets(html, pathname)).not.toContain(new URL(piecePath, origin).href)
			return { url, params }
		}

		function expectResultsOnly(html: string, pathname: string) {
			expect(html.match(/<main\b/g)).toHaveLength(1)
			expect(html.match(/<h1\b/g)).toHaveLength(1)
			expect(html).not.toMatch(/<form\b/)
			expect(html).not.toContain('class="search-panel')
			expect(linkTargets(html, pathname)).toContain(new URL('/search', origin).href)
		}

		const empty = await searchHtml('/search')
		const { url, params } = searchForm(empty, '/search')
		expect(Object.fromEntries(params)).toEqual({
			query: '',
			type: '',
			after: '',
			before: ''
		})
		searchForm(await searchHtml('/search?query=&page=1'), '/search?query=&page=1')

		const filters = {
			query: 'native-missing-query',
			type: 'cutover-kind',
			after: '2020-01-02',
			before: '2030-03-04'
		}
		const pathname = `/search?${new URLSearchParams(filters)}&page=1&unrelated=old`
		for (const page of ['2oops', '2']) {
			const firstPage = `/search?${new URLSearchParams(filters)}&unrelated=old`
			const response = await request(`${firstPage}&page=${page}`)
			expect(response.status).toBe(302)
			expect(response.headers.get('location')).toBe(firstPage)
		}
		const filtered = await searchHtml(pathname)
		expectResultsOnly(filtered, pathname)
		expect(filtered).toMatch(/<h1\b[^>]*>\s*No results found\s*<\/h1>/)
		expect(filtered).toContain(filters.query)
		expect(linkTargets(filtered, pathname)).not.toContain(new URL(piecePath, origin).href)
		for (const filter of ['type=cutover-kind', 'after=2020-01-02', 'before=2030-03-04']) {
			const filteredPath = `/search?${filter}`
			const filteredHtml = await searchHtml(filteredPath)
			expectResultsOnly(filteredHtml, filteredPath)
			expect(filteredHtml).not.toContain('Orphan must not be visible')
			expect(linkTargets(filteredHtml, filteredPath)).toContain(new URL(piecePath, origin).href)
		}

		// Construct the GET a native form would send after editing its controls;
		// this does not execute browser submission or the enhanced goto handler.
		params.set('query', 'Real Piece')
		params.set('after', '')
		params.set('before', '')
		expect(params.has('page')).toBe(false)
		url.search = params.toString()
		const results = await searchHtml(`${url.pathname}${url.search}`)
		expectResultsOnly(results, `${url.pathname}${url.search}`)
		expect(results).toMatch(/<h1\b[^>]*>\s*Search results\s*<\/h1>/)
		expect(linkTargets(results, url.pathname)).toContain(new URL(piecePath, origin).href)
	})

	test('serves the bundled editor schema publicly without exposing instance configuration', async () => {
		const original = await readFile(configFilename)
		const editorSchema = JSON.parse(
			await readFile(path.join(repository, 'packages/web/templates/config.schema.json'), 'utf8')
		)
		const config = JSON.parse(original.toString('utf8'))
		config.url.app = 'https://private.schema.test'
		config.content.text = {
			title: 'PRIVATE_SCHEMA_TITLE',
			description: 'PRIVATE_SCHEMA_DESCRIPTION'
		}
		config.auth = {
			secret: 'schema-test-session-secret-at-least-32-characters',
			credentials: { username: 'schema-private-user', password: 'schema-private-password' }
		}
		try {
			await stopBuiltApp()
			await writeFile(configFilename, JSON.stringify(config))
			origin = await startBuiltApp()
			expect((await request('/admin', 'text/html')).status).toBe(302)
			for (const pathname of ['/schema.json', '/schema.json?include=config&path=/private.yaml']) {
				const response = await request(pathname, 'application/schema+json')
				expect(response.status).toBe(200)
				expect(response.headers.get('content-type')).toBe('application/schema+json; charset=utf-8')
				expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
				expect(response.headers.has('location')).toBe(false)
				const body = await response.text()
				expect(JSON.parse(body)).toEqual(editorSchema)
				for (const value of [
					config.url.app,
					config.content.text.title,
					config.content.text.description,
					config.auth.secret,
					config.auth.credentials.username,
					config.auth.credentials.password,
					configFilename
				])
					expect(body).not.toContain(value)
			}
			const head = await request('/schema.json', 'application/schema+json', { method: 'HEAD' })
			expect(head.status).toBe(200)
			expect(head.headers.get('content-type')).toBe('application/schema+json; charset=utf-8')
			expect(head.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate')
			expect(await head.text()).toBe('')
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	})

	test('omitted feed.about hides the card while subscription and machine feeds remain available', async () => {
		for (const feed of feedCases)
			expectNativeFeed(await pageHtml(`${feed.folder}/feed.html`), feed, false, true)
		originalMachineFeeds = await machineFeedSnapshot()
	})

	test('serves typed/untyped listings and rejects unknown or malformed types and feed formats', async () => {
		for (const pathname of [
			'/pieces',
			'/pieces/cutover-kind',
			'/rss/pieces/cutover-kind/feed.html',
			'/rss/pieces/cutover-kind/feed.md'
		]) {
			const html = await pageHtml(pathname)
			expect(html).toContain('Real Piece')
			expect(html).not.toContain('Orphan must not be visible')
		}
		for (const pathname of ['/rss/pieces/feed.html', '/rss/pieces/feed.md'])
			expect(await pageHtml(pathname)).toContain('Real Piece')
		const emptyYear = await pageHtml('/pieces/cutover-kind?year=2022&page=1')
		expect(linkTargets(emptyYear, '/pieces/cutover-kind')).not.toContain(
			new URL(piecePath, origin).href
		)
		// A reroute must retain pagination and redirect empty pages to the public path.
		const emptyPage = await request('/pieces/cutover-kind?year=2023&page=2')
		expect(emptyPage.status).toBe(302)
		expect(emptyPage.headers.get('location')).toBe('/pieces/cutover-kind')
		for (const pathname of [
			'/pieces/unconfigured-kind',
			'/pieces/unknown-kind/real-piece',
			'/pieces/cutover-kind%2Fother',
			'/rss/pieces/unconfigured-kind/feed.html',
			'/rss/pieces/unconfigured-kind/feed.md',
			'/rss/pieces/cutover-kind/feed.invalid',
			'/pieces/cutover-kind/missing'
		]) {
			const response = await request(pathname)
			expect(response.status, pathname).toBe(404)
			const html = await response.text()
			expect(html).not.toContain('Orphan must not be visible')
		}
		const malformed = await request('/pieces/%E0%A4%A')
		expect(malformed.status).toBe(400)
		expect(await malformed.text()).not.toContain('Orphan must not be visible')
	})

	test('keeps API template data public and independent of site section settings', async () => {
		const response = await request('/api/pieces?tag=field-notes', 'application/json')
		expect(response.status).toBe(200)
		const body = await response.text()
		const result = JSON.parse(body)
		expect(result.pieces).toHaveLength(1)
		originalPublicPiece = result.pieces[0]
		expect(result.pieces[0]).toMatchObject({
			title: 'Real Piece',
			type: 'cutover-kind',
			metadata: { artwork: 'cover-key' },
			templates: {
				icon: { name: 'default', fields: { image: 'cover-key' } },
				page: { name: 'default', fields: { runtime: 123, people: [{ name: 'Ada Example' }] } },
				opengraph: { name: 'default', fields: { director: 'Ada Example', runtime: 123 } }
			}
		})
		for (const template of Object.values(result.pieces[0].templates))
			expect(Object.keys(template as object).sort()).toEqual(['fields', 'name'])
		for (const key of ['components', 'file_path', 'json_metadata'])
			expect(result.pieces[0]).not.toHaveProperty(key)
		const invalid = await request('/api/pieces?type=unconfigured-kind', 'application/json')
		expect(invalid.status).toBe(400)
		expect(await invalid.text()).toBe('invalid type')
	})

	test('serves selected runtime site images without changing piece OG or exposing neighboring files', async () => {
		const original = await readFile(configFilename)
		const imageDirectory = path.join(directory, 'content/images')
		await mkdir(imageDirectory, { recursive: true })
		const iconA =
			'<svg xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" fill="red"/></svg>'
		const iconB = iconA.replace('red', 'tan') // Same size, different content.
		const smallPng = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
			'base64'
		)
		const largePng = await readFile(path.join(webRoot, 'static/images/favicon.png'))
		const variants = [
			{ images: {}, icon: iconA, png: smallPng },
			{
				images: {
					favicon: './content/images/PRIVATE_ICON.svg',
					opengraph: './content/images/PRIVATE_SHARE.png'
				},
				icon: iconA,
				png: largePng
			},
			{
				images: {
					favicon: './content/images/PRIVATE_ICON.svg',
					opengraph: './content/images/PRIVATE_SHARE.png'
				},
				icon: iconB,
				png: smallPng
			},
			{
				images: {
					favicon: './content/images/RENAMED_ICON new.svg',
					opengraph: './content/images/RENAMED_SHARE new.png'
				},
				renamed: true,
				icon: iconA,
				png: smallPng
			}
		]
		const previousEtags = new Map<string, string>()
		const previousUrls = new Map<string, string>()
		const bundledShareBefore = await request('/images/opengraph.png', 'image/png')
		const bundledShareBytes = Buffer.from(await bundledShareBefore.arrayBuffer())
		expect(bundledShareBefore.status).toBe(200)
		try {
			for (const variant of variants) {
				await stopBuiltApp()
				const renamed = 'renamed' in variant
				const iconFilename = renamed ? 'RENAMED_ICON new.svg' : 'PRIVATE_ICON.svg'
				const shareFilename = renamed ? 'RENAMED_SHARE new.png' : 'PRIVATE_SHARE.png'
				await writeFile(path.join(imageDirectory, iconFilename), variant.icon)
				await writeFile(path.join(imageDirectory, shareFilename), variant.png)
				await writeFile(path.join(imageDirectory, 'unselected.png'), variant.png)
				await writeFile(path.join(imageDirectory, 'PRIVATE_ICON.svg.gz'), 'stale gzip')
				await writeFile(path.join(imageDirectory, 'PRIVATE_SHARE.png.br'), 'stale brotli')
				const config = JSON.parse(original.toString('utf8'))
				config.content.images = variant.images
				config.url = { app: 'https://public.images.test', app_assets: '/cdn' }
				await writeFile(configFilename, JSON.stringify(config))
				origin = await startBuiltApp()
				const customFavicon = renamed
					? '/assets/favicon/RENAMED_ICON%20new.svg'
					: '/assets/favicon/PRIVATE_ICON.svg'
				const customOpengraph = renamed
					? '/assets/opengraph/RENAMED_SHARE%20new.png'
					: '/assets/opengraph/PRIVATE_SHARE.png'
				const favicon = 'favicon' in variant.images ? customFavicon : '/cdn/images/favicon.png'
				const opengraph =
					'opengraph' in variant.images ? customOpengraph : '/cdn/images/opengraph.png'
				const root = await pageHtml('/')
				expect(htmlHead(root)).toContain(`rel="icon" href="${favicon}"`)
				expect(htmlHead(root)).toContain(
					`property="og:image" content="https://public.images.test${opengraph}"`
				)
				const piece = await pageHtml()
				expect(htmlHead(piece)).toContain(`rel="icon" href="${favicon}"`)
				expect(htmlHead(piece)).toContain(
					'property="og:image" content="https://public.images.test/pieces/assets/cutover/share.png"'
				)
				const dataResponse = await request(
					'/__data.json?x-sveltekit-invalidated=11',
					'application/json'
				)
				expect(dataResponse.status).toBe(200)
				const data = await dataResponse.text()
				for (const body of [root, piece, data]) {
					for (const privatePath of [
						'./content/images/',
						...Object.values(variant.images),
						imageDirectory,
						configFilename
					])
						expect(body).not.toContain(privatePath)
				}
				for (const feed of [
					'/rss/pieces/feed.xml',
					'/rss/pieces/cutover-kind/feed.xml',
					'/rss/tags/field-notes/feed.xml'
				]) {
					const response = await request(feed, 'application/xml')
					expect(response.status).toBe(200)
					const xml = await response.text()
					expect(xml).toContain(`<url>https://public.images.test${opengraph}</url>`)
					expect(xml).not.toContain('content/images/')
					expect(xml).not.toContain(imageDirectory)
				}
				for (const [role, selected, bytes, mime] of [
					['favicon', 'favicon' in variant.images, Buffer.from(variant.icon), 'image/svg+xml'],
					['opengraph', 'opengraph' in variant.images, variant.png, 'image/png']
				] as const) {
					const assetUrl = role === 'favicon' ? favicon : opengraph
					const requestedUrl = role === 'favicon' ? customFavicon : customOpengraph
					const endpoint = `${requestedUrl}?file=/private/unselected.png`
					if (!selected) {
						const response = await request(endpoint)
						expect(response.status).toBe(404)
						expect(response.headers.get('cache-control')).toBe('no-store')
						continue
					}
					const etag = await expectSiteAssetResponse(endpoint, bytes, mime, previousEtags.get(role))
					previousEtags.set(role, etag)
					const previousUrl = previousUrls.get(role)
					if (previousUrl && previousUrl !== assetUrl) {
						expect(root).not.toContain(previousUrl)
						for (const method of ['GET', 'HEAD']) {
							const retired = await request(previousUrl, 'image/*', { method })
							expect(retired.status).toBe(404)
							expect(retired.headers.get('cache-control')).toBe('no-store')
						}
					}
					previousUrls.set(role, assetUrl)
				}
				for (const pathname of [
					'/assets/favicon/unselected.png',
					'/assets/opengraph/unselected.png',
					'/assets/favicon/%2e%2e%2fPRIVATE_ICON.svg',
					'/assets/opengraph/%2e%2e%2fPRIVATE_SHARE.png',
					'/assets/unknown/PRIVATE_ICON.svg',
					'/site-assets/favicon',
					'/site-assets/opengraph'
				])
					expect((await request(pathname)).status, pathname).toBe(404)
				const bundledIcon = await request('/images/favicon.png', 'image/png')
				expect(bundledIcon.status).toBe(200)
				expect(Buffer.from(await bundledIcon.arrayBuffer())).toEqual(largePng)
				const bundledShareAfter = await request('/images/opengraph.png', 'image/png')
				expect(bundledShareAfter.status).toBe(200)
				expect(bundledShareAfter.headers.get('etag')).toBe(bundledShareBefore.headers.get('etag'))
				expect(bundledShareAfter.headers.get('cache-control')).toBe(
					bundledShareBefore.headers.get('cache-control')
				)
				expect(Buffer.from(await bundledShareAfter.arrayBuffer()).equals(bundledShareBytes)).toBe(
					true
				)
			}
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	}, 60000)

	describe('local fonts with restart-bound configuration', () => {
		const appUrl = 'https://public.fonts.test'

		async function configureFont(original: Buffer, source?: string) {
			const config = JSON.parse(original.toString('utf8'))
			config.content.fonts = source ? { sans: source } : {}
			config.url.app = appUrl
			config.theme.globals['font-sans-url'] = '"/fonts/authored.woff2"'
			config.auth = {
				secret: 'font-test-session-secret-at-least-32-characters',
				credentials: { username: 'admin', password: 'private-password' }
			}
			await writeFile(configFilename, JSON.stringify(config))
		}

		async function expectPublicFontPresentation(url: string, source?: string, retiredUrl?: string) {
			const fontDirectory = path.join(directory, 'content/fonts')
			for (const pathname of ['/', piecePath, '/signin']) {
				const html = await pageHtml(pathname)
				expect(htmlHead(html)).toContain(url)
				expect(html).not.toContain(fontDirectory)
				expect(html).not.toContain('content/fonts/')
				if (retiredUrl) expect(html).not.toContain(retiredUrl)
				if (source) expect(html).not.toContain(source)
			}
			const data = await request('/__data.json?x-sveltekit-invalidated=11', 'application/json')
			expect(data.status).toBe(200)
			const dataBody = await data.text()
			expect(dataBody).not.toContain(fontDirectory)
			expect(dataBody).not.toContain('content/fonts/')
			expect(dataBody).not.toContain('"fonts":')
			if (source) expect(dataBody).not.toContain(source)
		}

		async function expectFontAssetIsolation(endpoint: string, bundled: Buffer) {
			for (const pathname of [
				'/assets/fonts/unselected.woff2',
				'/assets/fonts/%2e%2e%2fPRIVATE_FONT.woff2',
				'/assets/fonts/PRIVATE_FONT.woff2.gz',
				'/assets/fonts/PRIVATE_FONT.woff2.br',
				'/site-assets/font-sans'
			])
				expect((await request(pathname, 'font/woff2')).status, pathname).toBe(404)
			for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
				const response = await request(endpoint, 'font/woff2', {
					method,
					headers: { origin: appUrl }
				})
				expect(response.status).toBe(405)
			}
			const builtFont = await request('/fonts/noto-sans.woff2', 'font/woff2')
			expect(Buffer.from(await builtFont.arrayBuffer())).toEqual(bundled)
		}

		test.each([
			{
				name: 'omitted source',
				source: undefined,
				filename: 'PRIVATE_FONT.woff2',
				url: '/fonts/authored.woff2'
			},
			{
				name: 'missing selected file',
				source: './content/fonts/PRIVATE_MISSING.woff2',
				filename: 'PRIVATE_MISSING.woff2',
				url: '/assets/fonts/PRIVATE_MISSING.woff2'
			}
		])(
			'returns generic uncached font 404s for $name without exposing directories',
			async ({ source, filename, url }) => {
				const original = await readFile(configFilename)
				const fontDirectory = path.join(directory, 'content/fonts')
				const bundled = await readFile(path.join(webRoot, 'static/fonts/noto-sans.woff2'))
				await mkdir(fontDirectory, { recursive: true })
				try {
					await stopBuiltApp()
					const fontFilename = path.join(fontDirectory, filename)
					if (source) await rm(fontFilename, { force: true })
					else await writeFile(fontFilename, bundled)
					await writeFile(path.join(fontDirectory, 'unselected.woff2'), bundled)
					await writeFile(`${fontFilename}.gz`, 'stale gzip')
					await writeFile(`${fontFilename}.br`, 'stale brotli')
					await configureFont(original, source)
					origin = await startBuiltApp()
					const unselectedUrl = '/assets/fonts/renamed%20font%20100%25%C3%A9.woff2'
					await expectPublicFontPresentation(url, source, unselectedUrl)
					const endpoint = `/assets/fonts/${filename}?file=/private/unselected.woff2`
					for (const method of ['GET', 'HEAD']) {
						const response = await request(endpoint, 'font/woff2', { method })
						expect(response.status).toBe(404)
						expect(response.headers.get('cache-control')).toBe('no-store')
						expect(await response.text()).toBe(method === 'HEAD' ? '' : 'Not found')
						const unselected = await request(unselectedUrl, 'font/woff2', { method })
						expect(unselected.status).toBe(404)
						expect(unselected.headers.get('cache-control')).toBe('no-store')
					}
					await expectFontAssetIsolation(endpoint, bundled)
				} finally {
					await stopBuiltApp()
					await writeFile(configFilename, original)
					origin = await startBuiltApp()
				}
			},
			30000
		)

		test('rereads public font files and adopts renamed selections after restart', async () => {
			const original = await readFile(configFilename)
			const fontDirectory = path.join(directory, 'content/fonts')
			const bundled = await readFile(path.join(webRoot, 'static/fonts/noto-sans.woff2'))
			await mkdir(fontDirectory, { recursive: true })
			const restarts = [
				{
					source: './content/fonts/PRIVATE_FONT.woff2',
					filename: 'PRIVATE_FONT.woff2',
					url: '/assets/fonts/PRIVATE_FONT.woff2',
					bytes: bundled
				},
				{
					source: './content/fonts/renamed font 100%é.woff2',
					filename: 'renamed font 100%é.woff2',
					url: '/assets/fonts/renamed%20font%20100%25%C3%A9.woff2',
					bytes: bundled
				}
			]
			let previousUrl: string | undefined
			try {
				for (const restart of restarts) {
					await stopBuiltApp()
					const fontFilename = path.join(fontDirectory, restart.filename)
					await writeFile(fontFilename, restart.bytes)
					await writeFile(path.join(fontDirectory, 'unselected.woff2'), bundled)
					await writeFile(`${fontFilename}.gz`, 'stale gzip')
					await writeFile(`${fontFilename}.br`, 'stale brotli')
					await configureFont(original, restart.source)
					origin = await startBuiltApp()
					const retiredUrl = previousUrl && previousUrl !== restart.url ? previousUrl : undefined
					await expectPublicFontPresentation(restart.url, restart.source, retiredUrl)
					const endpoint = `${restart.url}?file=/private/unselected.woff2`
					const etag = await expectSiteAssetResponse(endpoint, restart.bytes, 'font/woff2')
					const replacement = Buffer.from('modified after first request')
					await writeFile(fontFilename, replacement)
					const updated = await request(endpoint, 'font/woff2', {
						headers: { 'if-none-match': etag }
					})
					expect({
						status: updated.status,
						bytes: Buffer.from(await updated.arrayBuffer()),
						length: updated.headers.get('content-length'),
						etag: updated.headers.get('etag')
					}).toEqual({
						status: 200,
						bytes: replacement,
						length: String(replacement.length),
						etag: `"${createHash('sha256').update(replacement).digest('base64url')}"`
					})
					if (retiredUrl) {
						for (const method of ['GET', 'HEAD']) {
							const retired = await request(retiredUrl, 'font/woff2', { method })
							expect(retired.status).toBe(404)
							expect(retired.headers.get('cache-control')).toBe('no-store')
						}
					}
					previousUrl = restart.url
					await expectFontAssetIsolation(endpoint, bundled)
				}
			} finally {
				await stopBuiltApp()
				await writeFile(configFilename, original)
				origin = await startBuiltApp()
			}
		}, 60000)
	})

	test('keeps selected images public with authentication enabled and errors generic', async () => {
		const original = await readFile(configFilename)
		const config = JSON.parse(original.toString('utf8'))
		config.url.app = 'https://authenticated.images.test'
		config.auth = {
			secret: 'image-test-session-secret-at-least-32-characters',
			credentials: { username: 'admin', password: 'private-password' }
		}
		config.content.images = {
			favicon: './content/auth-icon.svg',
			opengraph: './content/PRIVATE_MISSING.png'
		}
		const icon = '<svg xmlns="http://www.w3.org/2000/svg"/>'
		await mkdir(path.join(directory, 'content'), { recursive: true })
		await writeFile(path.join(directory, 'content/auth-icon.svg'), icon)
		try {
			await stopBuiltApp()
			await writeFile(configFilename, JSON.stringify(config))
			origin = await startBuiltApp()
			for (const method of ['GET', 'HEAD']) {
				const response = await request('/assets/favicon/auth-icon.svg', 'image/*', { method })
				expect(response.status).toBe(200)
				expect(await response.text()).toBe(method === 'HEAD' ? '' : icon)
				for (const pathname of [
					'/assets/opengraph/PRIVATE_MISSING.png',
					'/assets/unknown/auth-icon.svg'
				]) {
					const missing = await request(pathname, 'image/*', { method })
					expect(missing.status).toBe(404)
					expect(missing.headers.get('cache-control')).toBe('no-store')
					expect(await missing.text()).toBe(method === 'HEAD' ? '' : 'Not found')
				}
			}
			const signIn = await pageHtml('/signin')
			expect(htmlHead(signIn)).toContain('rel="icon" href="/assets/favicon/auth-icon.svg"')
			expect(signIn).not.toContain('content/PRIVATE_MISSING.png')
			expect(signIn).not.toContain(path.join(directory, 'content'))
			const admin = await request('/admin', 'text/html')
			expect(admin.status).toBe(302)
			expect(admin.headers.get('location')).toContain('/signin')
			for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
				const response = await request('/assets/favicon/auth-icon.svg', 'application/json', {
					method,
					headers: { origin: config.url.app }
				})
				expect(response.status).toBe(405)
			}
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	}, 30000)

	test('adopts configured origins and CDN prefixes across restarts, ignoring ambient ORIGIN without moving framework assets', async () => {
		const original = await readFile(configFilename)
		const baseline = await request()
		expect(baseline.status).toBe(200)
		expectRuntimeCsp(baseline, await baseline.text())
		const deployments = [
			{
				label: 'A',
				app: 'https://Garden-A.example.test:8443/published-a/',
				app_assets: 'https://app-assets-a.example.test:8443/site/v1',
				luzzle_assets: 'https://piece-assets-a.example.test/archive/v1',
				requestOrigin: 'https://garden-a.example.test:8443',
				environment: {}
			},
			{
				label: 'B',
				app: 'http://garden-b.example.test:9443/published-b/',
				app_assets: 'https://app-assets-b.example.test/site/v2/',
				luzzle_assets: 'https://piece-assets-b.example.test/archive/v2/',
				requestOrigin: 'http://garden-b.example.test:9443',
				environment: { ORIGIN: 'https://public-b.example.test:10443/' }
			}
		]
		try {
			for (const deployment of deployments) {
				const { label, app, app_assets, luzzle_assets, requestOrigin, environment } = deployment
				const config = JSON.parse(original.toString('utf8'))
				config.url = { app, app_assets, luzzle_assets }
				expect(resolveAuthUrl(config.url.app), label).toBe(requestOrigin)
				await stopBuiltApp()
				await writeFile(configFilename, JSON.stringify(config))
				origin = await startBuiltApp(environment)

				// First request after the real bootstrap returns: incoming proxy values must not
				// override YAML. Only the local listener is contacted; CDNs are never fetched.
				const proxyProtocol = requestOrigin.startsWith('https:') ? 'http' : 'https'
				const response = await request(piecePath, 'text/html', {
					headers: {
						host: 'incoming.example.test:12443',
						'x-forwarded-host': 'forwarded.example.test:11443',
						'x-forwarded-proto': proxyProtocol,
						'x-forwarded-port': '10443'
					}
				})
				expect(response.status, label).toBe(200)
				const html = await response.text()
				expectRuntimeCsp(response, html, app_assets, luzzle_assets)
				expect(stablePageHeaders(response)).toEqual(stablePageHeaders(baseline))
				expectSameOriginFrameworkUrls(html, requestOrigin)
				const head = htmlHead(html)
				expect(head).toContain(
					`rel="icon" href="${app_assets.replace(/\/+$/, '')}/images/favicon.png"`
				)
				const pieces = luzzle_assets.replace(/\/+$/, '')
				expect(html).toContain(`src="${pieces}/pieces/assets/cutover/cover%20small.png"`)
				expect(head).toContain(
					`property="og:image" content="${pieces}/pieces/assets/cutover/share.png"`
				)
				// SeoHead renders page.url: canonical origin keeps its port, never url.app's prefix.
				expect(head).toContain(`property="og:url" content="${requestOrigin}${piecePath}"`)
				expect(html).toContain(app)
				if (label === 'B') {
					const policyAndHtml = (
						response.headers.get('content-security-policy') + html
					).toLowerCase()
					for (const previous of [
						deployments[0].app,
						deployments[0].app_assets,
						deployments[0].luzzle_assets
					])
						expect(policyAndHtml).not.toContain(new URL(previous).hostname)
				}
				const api = await request('/api/pieces?type=cutover-kind', 'application/json')
				expect(api.status).toBe(200)
				expect(api.headers.has('content-security-policy')).toBe(false)
				expect(api.headers.has('content-security-policy-report-only')).toBe(false)
				expect((await api.json()).pieces).toEqual([originalPublicPiece])
			}
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	}, 60000)

	test('enforces pre-handle form CSRF against the canonical request origin on a public GET-only endpoint', async () => {
		const original = await readFile(configFilename)
		const config = JSON.parse(original.toString('utf8'))
		config.url.app = 'https://configured-csrf.example.test:8443/garden/'
		const requestOrigin = resolveAuthUrl(config.url.app)
		const ignoredOrigin = 'https://request-csrf.example.test:9443'
		expect(requestOrigin).toBe('https://configured-csrf.example.test:8443')
		try {
			await stopBuiltApp()
			await writeFile(configFilename, JSON.stringify(config))
			origin = await startBuiltApp({ ORIGIN: ignoredOrigin })
			const get = await request('/api/pieces?type=cutover-kind', 'application/json')
			expect(get.status).toBe(200)
			expect((await get.json()).pieces).toEqual([originalPublicPiece])
			const cases = [
				{ label: 'canonical same origin', requestOrigin, status: 405 },
				{ label: 'cross origin', requestOrigin: 'https://cross.example.test', status: 403 },
				{ label: 'missing origin', requestOrigin: undefined, status: 403 },
				{ label: 'literal null origin', requestOrigin: 'null', status: 403 },
				{
					label: 'fixed localhost 3000 exception',
					requestOrigin: 'http://localhost:3000',
					status: 405
				},
				{
					label: 'fixed localhost 5173 exception',
					requestOrigin: 'http://localhost:5173',
					status: 405
				},
				{ label: 'untrusted localhost port', requestOrigin: 'http://localhost:3001', status: 403 },
				{
					label: 'ignored environment origin is not an exception',
					requestOrigin: ignoredOrigin,
					status: 403
				},
				{ label: 'listener is not the canonical origin', requestOrigin: origin, status: 403 },
				{
					label: 'browser origin matching spoofed forwarded host is not trusted',
					requestOrigin: 'http://spoofed.example.test:11443',
					status: 403
				}
			]
			for (const entry of cases) {
				const headers: Record<string, string> = {
					'content-type': 'application/x-www-form-urlencoded',
					host: 'incoming.example.test:12443',
					'x-forwarded-host': 'spoofed.example.test:11443',
					'x-forwarded-proto': 'http',
					'x-forwarded-port': '10443'
				}
				if (entry.requestOrigin !== undefined) headers.origin = entry.requestOrigin
				const response = await request('/api/pieces', 'application/json', {
					method: 'POST',
					headers,
					body: 'title=not-a-write'
				})
				expect(response.status, entry.label).toBe(entry.status)
				// 403 occurs before handle; 405 proves the gate passed, not a successful write.
				expect(response.headers.has('content-security-policy'), entry.label).toBe(false)
				if (entry.status === 403) {
					expect(response.headers.get('content-type'), entry.label).toContain('application/json')
					expect(await response.json(), entry.label).toEqual({
						message: 'Cross-site POST form submissions are forbidden'
					})
				}
			}
			for (const accept of ['*/*', 'application/json, */*']) {
				const response = await request('/api/pieces', accept, {
					method: 'POST',
					headers: { origin: 'https://cross.example.test', 'content-type': 'text/plain' },
					body: 'not-a-write'
				})
				expect(response.status, accept).toBe(403)
				expect(response.headers.get('content-type'), accept).toBeNull()
				expect(await response.text()).toBe('Cross-site POST form submissions are forbidden')
			}
			const json = await request('/api/pieces', 'application/json', {
				method: 'POST',
				headers: { origin: 'https://cross.example.test', 'content-type': 'application/json' },
				body: '{}'
			})
			expect(json.status).toBe(405)
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	})

	test('also gates unsafe PUT, PATCH and DELETE forms before GET-only endpoint dispatch', async () => {
		const original = await readFile(configFilename)
		const config = JSON.parse(original.toString('utf8'))
		config.url.app = 'https://method-csrf.example.test:9443/garden/'
		const requestOrigin = resolveAuthUrl(config.url.app)
		try {
			await stopBuiltApp()
			await writeFile(configFilename, JSON.stringify(config))
			origin = await startBuiltApp({ ORIGIN: 'http://ignored.example.test:3000' })
			for (const method of ['PUT', 'PATCH', 'DELETE']) {
				for (const entry of [
					{ label: 'same origin reaches method dispatch', origin: requestOrigin, status: 405 },
					{
						label: 'cross origin rejected before handle',
						origin: 'https://cross.example.test',
						status: 403
					},
					{ label: 'missing origin', origin: undefined, status: 403 },
					{ label: 'literal null origin', origin: 'null', status: 403 },
					{
						label: 'browser origin matching spoofed forwarded host is not trusted',
						origin: 'http://spoofed.example.test:11443',
						status: 403
					}
				]) {
					const headers: Record<string, string> = {
						'content-type': 'application/x-www-form-urlencoded',
						host: 'incoming.example.test:12443',
						'x-forwarded-host': 'spoofed.example.test:11443',
						'x-forwarded-port': '10443'
					}
					if (entry.origin !== undefined) headers.origin = entry.origin
					const response = await request('/api/pieces', 'application/json', {
						method,
						headers,
						body: 'title=not-a-write'
					})
					expect(response.status, `${method}: ${entry.label}`).toBe(entry.status)
					expect(response.headers.has('content-security-policy')).toBe(false)
					if (entry.status === 403)
						expect(await response.json()).toEqual({
							message: `Cross-site ${method} form submissions are forbidden`
						})
				}
			}
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	})

	test('serves configured theme changes only after restart without exposing server configuration', async () => {
		const original = await readFile(configFilename)
		async function configuredStyles() {
			const html = await pageHtml()
			const styles = [
				...htmlHead(html).matchAll(
					/<style\b[^>]*data-luzzle-configured-styles[^>]*>([\s\S]*?)<\/style>/g
				)
			]
			expect(styles).toHaveLength(1)
			const css = styles[0][1]
			expect(css).not.toBe('')
			for (const privatePath of [directory, configFilename]) expect(css).not.toContain(privatePath)
			const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/)?.[1]
			expect(body).toBeDefined()
			expect(body).not.toContain(css)
			return css
		}
		try {
			const before = await configuredStyles()
			const config = JSON.parse(original.toString('utf8'))
			config.theme.light['color-primary'] = '#a13579'
			await writeFile(configFilename, JSON.stringify(config))
			expect(await configuredStyles()).toBe(before)
			await stopBuiltApp()
			origin = await startBuiltApp()
			expect(await configuredStyles()).not.toBe(before)
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	})

	test('keeps mapped page data, assets, tags, navigation and SEO useful in native SSR', async () => {
		const html = await pageHtml()
		expectBuiltIn(html)
		expect(html).toContain('pieceTypes:["cutover-kind"]')
		const searchLinks = html.match(/<a\b(?=[^>]*\baria-label="search")[^>]*>[\s\S]*?<\/a>/g) ?? []
		expect(searchLinks).toHaveLength(1)
		expect(linkTargets(searchLinks[0]!, piecePath)).toEqual([new URL('/search', origin).href])
		expect(searchLinks[0]).not.toMatch(/\b(?:role="button"|onclick=)/)
		for (const text of ['Native catalog', 'Ada Example', '2001', '123 min'])
			expect(html).toContain(text)
		expect(html).toContain('href="https://example.com/real-piece"')
		expect(html).toContain('href="/tags/field-notes"')
		expect(html).toContain('src="/pieces/assets/cutover/cover%20small.png"')
		expect(html.indexOf('aria-label="Global"')).toBeLessThan(html.indexOf('<h1'))
		const image = await request('/pieces/assets/cutover/cover%20small.png')
		expect(image.status).toBe(200)
		expect(Buffer.from(await image.arrayBuffer())).toEqual(
			await readFile(path.join(webRoot, 'static/images/favicon.png'))
		)
	})

	test('preserves anonymous admin redirects and private JSON denials', async () => {
		for (const pathname of [
			'/admin/view/published/real-piece.cutover-kind.md/page',
			'/admin/view/preview/selected-job/page',
			'/admin/open/cutover-kind/real-piece',
			'/admin/open/unconfigured-kind/real-piece'
		]) {
			const browser = await request(pathname)
			expect(browser.status).toBe(302)
			expect(browser.headers.get('location')).toBe('/')
			const api = await request(pathname, 'application/json')
			expect(api.status).toBe(403)
			expect(api.headers.get('cache-control')).toBe('private, no-store')
		}
	})

	test('stock home keeps type links in its introduction and only queries configured published types', async () => {
		const html = await pageHtml('/')
		expect(html).toMatch(/<h1[^>]*>luzzle pieces<\/h1>/)
		expect(html).toContain('class="type-link"')
		const targets = linkTargets(html, '/')
		for (const pathname of ['/pieces', '/pieces/cutover-kind', piecePath])
			expect(targets).toContain(new URL(pathname, origin).href)
		expect(html).toMatch(/<h2[^>]*>latest<\/h2>/)
		expect(html).not.toMatch(/<h2[^>]*>random<\/h2>/)
		expect(html).toContain('Real Piece')
		expect(html.match(/class="icon-placeholder\b/g)).toHaveLength(1)
		expect(html).not.toMatch(/class="(?:poster|recipe-card|book)\b/)
		expect(html).not.toContain('Orphan must not be visible')
	})

	test.each([
		{ label: 'random only', latest: false, random: true, headings: ['random'] },
		{ label: 'both lists disabled', latest: false, random: false, headings: [] }
	])('home: $label', async ({ latest, random, headings }) => {
		await writeFile(
			path.join(directory, 'sections/home.md'),
			'# Native home\n\nBrowse [pieces](/pieces).\n\n<script>window.siteInjected=1</script>'
		)
		await restartWithPages({ home: { body: 'sections/home.md', latest, random } })
		const html = await pageHtml('/')
		expect(html).toContain('<h1>Native home</h1>')
		expect(html).toContain('href="/pieces"')
		expect(html).not.toContain('class="type-link"')
		expect(html).not.toContain('<script>window.siteInjected=1</script>')
		expect(html).toContain('&lt;script&gt;')
		const visibleCollections = [...html.matchAll(/<h2[^>]*>(latest|random)<\/h2>/g)].map(
			(match) => match[1]
		)
		expect(visibleCollections).toEqual(headings)
		// Both collections share lazy decorations without changing which pieces are selected.
		const count = headings.length
		expect(html.match(/class="piece-card\b/g) ?? []).toHaveLength(count)
		expect(html.match(/class="icon-placeholder\b/g) ?? []).toHaveLength(count)
		expect(
			linkTargets(html, '/').filter((href) => href === new URL(piecePath, origin).href)
		).toHaveLength(count)
		expect(html).not.toMatch(/class="(?:poster|recipe-card|book)\b/)
		expect(html.includes('Orphan must not be visible')).toBe(false)
		expect(html).not.toContain(directory)
	})

	test('configured feed Markdown can be shown with subscription controls disabled', async () => {
		await writeFile(
			path.join(directory, 'sections/about.md'),
			'## What is this?\n\nA [normal link](/pieces).'
		)
		await restartWithPages({ feed: { about: 'sections/about.md', links: false } })
		const feed = feedCases[0]
		const html = await pageHtml(`${feed.folder}/feed.html`)
		expectNativeFeed(html, feed, true, false)
		expect(html).toContain('<h2>What is this?</h2>')
		expect(html).toContain('href="/pieces"')
		expect(await machineFeedSnapshot()).toEqual(originalMachineFeeds)
	})

	test('loads lazily and caches shared Markdown across home/feed until restart', async () => {
		const file = path.join(directory, 'sections/shared.md')
		await writeFile(file, '# First shared copy')
		const settings = {
			home: { body: 'sections/shared.md', latest: false },
			feed: { about: 'sections/shared.md', links: false }
		}
		await restartWithPages(settings)
		await writeFile(file, '# Written after server startup')
		expect(await pageHtml('/')).toContain('<h1>Written after server startup</h1>')
		await writeFile(file, '# Later file edit')
		expect(await pageHtml('/rss/pieces/feed.html')).toContain(
			'<h1>Written after server startup</h1>'
		)
		expect(await pageHtml('/')).not.toContain('<h1>Later file edit</h1>')
		await restartWithPages(settings)
		expect(await pageHtml('/')).toContain('<h1>Later file edit</h1>')
	})

	test('a missing home override fails on first use without blocking unrelated feeds at boot', async () => {
		await restartWithPages({ home: { body: 'sections/missing.md' }, feed: { links: true } })
		expectNativeFeed(await pageHtml('/rss/pieces/feed.html'), feedCases[1], false, true)
		const failedHome = await request('/')
		expect(failedHome.status).toBe(500)
		const html = await failedHome.text()
		expect(html).toContain('error 500')
		expect(html).not.toContain('sections/missing.md')
		expect(html).not.toContain(directory)
	})

	test('Markdown image URLs do not publish neighboring filesystem assets', async () => {
		await writeFile(path.join(directory, 'sections/image.md'), '![Private neighbor](neighbor.png)')
		await writeFile(path.join(directory, 'sections/neighbor.png'), 'not a public asset')
		await restartWithPages({ feed: { about: 'sections/image.md' } })
		expect(await pageHtml('/rss/pieces/feed.html')).toContain('src="neighbor.png"')
		const missing = await request('/rss/pieces/neighbor.png')
		expect(missing.status).toBe(404)
		expect(await missing.text()).toContain('page not found')
	})

	test('adopts runtime error Markdown for framework and expected 404s without leaking into healthy pages or APIs', async () => {
		const copies = ['Runtime missing copy', 'Runtime client copy', 'Runtime server copy']
		for (const [index, key] of ['404', '4xx', '500'].entries())
			await writeFile(path.join(directory, `sections/error-${key}.md`), `# ${copies[index]}`)
		await restartWithPages({
			error: {
				'404': { body: 'sections/error-404.md', home: false },
				'4xx': { body: 'sections/error-4xx.md' },
				'500': { body: 'sections/error-500.md' }
			}
		})
		function expectNoErrorContent(body: string) {
			for (const value of [...copies, 'presentation', directory, configFilename, 'sections/error-'])
				expect(body).not.toContain(value)
		}
		for (const pathname of ['/no-such-runtime-page', '/pieces/cutover-kind/missing']) {
			const response = await request(pathname)
			expect(response.status, pathname).toBe(404)
			const html = await response.text()
			expect(html).toContain('<h1>Runtime missing copy</h1>')
			expect(html).not.toContain('Runtime client copy')
			expect(html).not.toContain('Runtime server copy')
			expect(html).toContain('aria-label="main page"')
			expect(linkTargets(html, pathname)).toContain(new URL('/', origin).href)
			expect(html).not.toMatch(/<a\b[^>]*\bclass="[^"]*\bhome-button\b/)
			for (const privateValue of [directory, configFilename, 'sections/error-'])
				expect(html).not.toContain(privateValue)
		}
		const unmatched = await request('/no-such-runtime-page', 'application/json')
		expect(unmatched.status).toBe(404)
		expect(unmatched.headers.get('content-type')).toContain('text/html')
		const unmatchedBody = await unmatched.text()
		expect(unmatchedBody).toContain('page not found')
		expectNoErrorContent(unmatchedBody)

		// Matched loader errors render +error HTML even when JSON was requested.
		const matched = await request('/pieces/cutover-kind/missing', 'application/json')
		expect(matched.status).toBe(404)
		expect(matched.headers.get('content-type')).toContain('text/html')
		const matchedBody = await matched.text()
		expect(matchedBody).toContain('page not found')
		expectNoErrorContent(matchedBody)
		for (const pathname of ['/', piecePath, '/rss/pieces/feed.html'])
			expectNoErrorContent(await pageHtml(pathname))
		const feeds = await machineFeedSnapshot()
		expect(feeds).toEqual(originalMachineFeeds)
		for (const feed of Object.values(feeds)) expectNoErrorContent(feed.body)

		const publicApi = await request('/api/pieces?type=cutover-kind', 'application/json')
		expect(publicApi.status).toBe(200)
		const publicBody = await publicApi.text()
		expectNoErrorContent(publicBody)
		expect(JSON.parse(publicBody).pieces).toEqual([originalPublicPiece])
		for (const accept of ['text/html', 'application/json']) {
			const invalid = await request('/api/pieces?type=unconfigured-kind', accept)
			expect(invalid.status).toBe(400)
			const body = await invalid.text()
			expect(body).toBe('invalid type')
			expectNoErrorContent(body)
		}
		const denied = await request('/admin/open/cutover-kind/real-piece', 'application/json')
		expect(denied.status).toBe(403)
		expect(denied.headers.get('cache-control')).toBe('private, no-store')
		expectNoErrorContent(await denied.text())
		const methodError = await request('/api/pieces', 'application/json', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{}'
		})
		expect(methodError.status).toBe(405)
		expectNoErrorContent(await methodError.text())
	})
})
