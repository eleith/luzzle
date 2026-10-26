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
let originalBuild: Record<string, string>
let originalMachineFeeds: MachineFeeds
let originalPublicPiece: unknown
let childEnv: NodeJS.ProcessEnv

const startServer = `
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
const { server } = await import(pathToFileURL(process.argv[1]).href);
if (!server.server.listening) await once(server.server, 'listening');
process.send({ port: server.server.address().port });
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
    note: 'Raw indexed note', summary: 'Published route description',
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
    { ...asset, transformation: 'palette', mime_type: 'application/json', content: JSON.stringify({ accent: '#123456', background: '#234567' }) },
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

function validateRuntimeConfig() {
	return exec(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`
import { pathToFileURL } from 'node:url';
const { loadConfig } = await import(pathToFileURL(process.argv[1]).href);
loadConfig(process.argv[2]);
`,
			path.join(repository, 'packages/web/templates/dist/config/index.js'),
			configFilename
		],
		{ cwd: directory, env: childEnv, timeout: 30000 }
	)
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
async function pageHtml(pathname = piecePath) {
	const response = await request(pathname)
	expect(response.status).toBe(200)
	return response.text()
}
function htmlHead(html: string) {
	const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
	if (head === undefined) throw new Error('Expected the real app HTML head')
	return head
}

function expectInlineConfiguredCss(html: string) {
	const head = htmlHead(html)
	const styles = [
		...head.matchAll(/<style\b[^>]*\bdata-luzzle-configured-styles\b[^>]*>([\s\S]*?)<\/style>/g)
	]
	expect(styles).toHaveLength(1)
	const [style, css] = styles[0]
	const charset = head.match(/<meta\b[^>]*\bcharset\b[^>]*>/i)
	if (!charset) throw new Error('Expected the real app charset meta tag')
	const stylePosition = head.indexOf(style)
	expect(stylePosition).toBeGreaterThanOrEqual(head.indexOf(charset[0]) + charset[0].length)
	const frameworkStyles =
		head.match(
			/<link\b[^>]*\brel=["']stylesheet["'][^>]*>|<style\b(?![^>]*\bdata-luzzle-configured-styles\b)[^>]*>[\s\S]*?<\/style>/g
		) ?? []
	// The app-template token precedes Kit's linked or inlined component CSS.
	for (const frameworkStyle of frameworkStyles)
		expect(head.indexOf(frameworkStyle)).toBeGreaterThanOrEqual(stylePosition + style.length)
	expect(html).not.toContain('%luzzle.styles%')
	const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/)?.[1]
	if (body === undefined) throw new Error('Expected the real app HTML body')
	expect(body).not.toContain('data-luzzle-configured-styles')
	expect(body).not.toContain('--editor-background:')
	const declaration = css.match(/--color-primary: [^;]+;/)?.[0]
	if (!declaration) throw new Error('Expected a configured primary color')
	expect(head.split(declaration)).toHaveLength(2)
	// Include bootstrap scripts: CSS must remain server-only rather than loader data.
	expect(body).not.toContain(declaration)
	expect(css).not.toContain('box-sizing:')
	expect(css).not.toContain('.button')
	expect(css).not.toContain('.markdown')
	expect(css).not.toContain('pre.shiki')
	expect(css.indexOf('--color-primary:')).toBeGreaterThanOrEqual(0)
	expect(css.indexOf('--editor-background:')).toBeGreaterThan(css.indexOf('--color-primary:'))
	for (const privatePath of [directory, configFilename, path.basename(configFilename)])
		expect(css).not.toContain(privatePath)
	expect(css).not.toMatch(/\.(?:cm-|monaco-|ace_)/)
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
		const response = await request(new URL(href, origin).pathname, 'text/css')
		expect(response.status).toBe(200)
		sources.push(await response.text())
	}
	return sources.join('\n')
}

function expectThemeVariables(css: string, selector: string, variables: Record<string, string>) {
	const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
	const block = blocks.find(
		([, selectors, declarations]) =>
			selectors.trim().replace(/\s+/g, ' ') === selector &&
			Object.entries(variables).every(([name, value]) =>
				declarations.includes(`--${name}: ${value};`)
			)
	)
	expect(
		block,
		`Expected theme variables for ${selector}: ${JSON.stringify(variables)}`
	).toBeDefined()
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
	expectInlineConfiguredCss(html)
	expectFeedSeo(html, feed)
	expect(html.match(/aria-label="Global"/g)).toHaveLength(1)
	for (const label of ['main page', 'search', 'change theme', 'random'])
		expect(html).toContain(`aria-label="${label}"`)
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
			expect(html).toContain(`href="feed.${format}">${label}</a>`)
		expect(html).toContain('aria-label="RSS feed URL"')
		expect(html).toContain('aria-describedby="rss-instructions"')
		expect(html).toMatch(/\breadonly(?:\s|=|>)/)
		expect(html).toContain(`value="${feed.folder}/feed.xml"`)
		expect(html).toContain('copy</button>')
	} else expect(html).not.toContain('aria-label="RSS feed URL"')
	if (feed.count) {
		expect(html).toContain(`href="${piecePath}" class="item-card`)
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
			expect(body).not.toContain('data-luzzle-configured-styles')
			expect(body).not.toContain('--editor-background:')
			expect(body).not.toContain('--color-primary:')
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
			}
		}
	}
	return snapshot
}

function expectBuiltIn(html: string) {
	expectInlineConfiguredCss(html)
	expect(html).toMatch(/class="hero svelte-[a-z0-9]+"/)
	expect(html).toContain('class="poster')
	expect(html).toMatch(/<h1(?:\s[^>]*)?>Real Piece<\/h1>/)
	expect(html).toContain('<p>Published rendered note</p>')
	expect(html.match(/aria-label="Global"/g)).toHaveLength(1)
	expect(html).toContain('--banner-background-color: #234567')
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
		await exited
	} finally {
		clearTimeout(timeout)
	}
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
	originalBuild = await buildHashes()
	configFilename = path.join(directory, 'config.yaml')
	await writeFile(
		configFilename,
		JSON.stringify({
			url: { app: '' },
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
			theme: {
				light: { 'color-primary': '#135790' },
				dark: { 'color-primary': '#2468ac' },
				globals: {
					'font-sans-name': '"Runtime Sans A"',
					'font-sans-url': '"/fonts/runtime-a.woff2"',
					'font-sans-weight': '300 600',
					'radius-small': 'clamp(0.25rem, 1vw + 2px, 0.75rem)'
				},
				markdown: { sidenote: { 'sidenote-callout-before-content': '"A < & >"' } }
			}
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
	test('uses runtime-configured piece types and the native stock page after a blank build', async () => {
		const html = await pageHtml()
		expectBuiltIn(html)
		expect(html).toContain('pieceTypes:["cutover-kind"]')
	})

	test('omitted feed.about hides the card while subscription and machine feeds remain available', async () => {
		for (const feed of feedCases)
			expectNativeFeed(await pageHtml(`${feed.folder}/feed.html`), feed, false, true)
		originalMachineFeeds = await machineFeedSnapshot()
	})

	test('serves typed/untyped listings and rejects unknown types and feed formats', async () => {
		for (const pathname of [
			'/pieces/cutover-kind',
			'/rss/pieces/cutover-kind/feed.html',
			'/rss/pieces/cutover-kind/feed.md'
		]) {
			const html = await pageHtml(pathname)
			expect(html).toContain('Real Piece')
			expect(html).not.toContain('Orphan must not be visible')
		}
		for (const pathname of ['/pieces', '/rss/pieces/feed.html', '/rss/pieces/feed.md'])
			expect(await pageHtml(pathname)).toContain('Real Piece')
		for (const pathname of [
			'/pieces/unconfigured-kind',
			'/rss/pieces/unconfigured-kind/feed.html',
			'/rss/pieces/unconfigured-kind/feed.md',
			'/rss/pieces/cutover-kind/feed.invalid',
			'/pieces/cutover-kind/missing'
		]) {
			const response = await request(pathname)
			expect(response.status, pathname).toBe(404)
			const html = await response.text()
			expect(html).not.toContain('Orphan must not be visible')
			if (pathname === '/pieces/cutover-kind/missing')
				expect(expectInlineConfiguredCss(html)).toContain('--color-primary: #135790;')
		}
	})

	test('keeps API template data public and independent of site section settings', async () => {
		const response = await request('/api/pieces?type=cutover-kind', 'application/json')
		expect(response.status).toBe(200)
		const body = await response.text()
		expect(body).not.toContain('data-luzzle-configured-styles')
		expect(body).not.toContain('--editor-background:')
		expect(body).not.toContain('--color-primary:')
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

	test('keeps configured CSS fixed until restart, then adopts mounted config on the same build', async () => {
		const original = await readFile(configFilename)
		const lightEditor = ":root, :root[data-theme='light'], section[data-theme='light']"
		const darkEditor = ":root[data-theme='dark'], section[data-theme='dark']"
		const systemDark = ":root:not([data-theme='light'])"
		async function pageTheme() {
			const html = await pageHtml(piecePath)
			const css = expectInlineConfiguredCss(html)
			const head = htmlHead(html)
			const fixedCss = await frameworkCss(html)
			expect(fixedCss).toMatch(/box-sizing:\s*border-box/)
			expect(fixedCss).toContain('.button')
			expect(fixedCss).toContain('.markdown')
			expect(fixedCss).toContain('pre.shiki')
			expect(fixedCss).not.toContain('--color-primary: #135790;')
			expect(fixedCss).not.toContain('--color-primary: #a13579;')
			expect(head).not.toMatch(/\b(?:href|src)=["'][^"']*theme(?:\.build)?\.css\b/)
			return css
		}
		try {
			const cssA = await pageTheme()
			expectThemeVariables(cssA, ':root', {
				'color-primary': '#135790',
				'font-sans-name': '"Runtime Sans A"',
				'radius-small': 'clamp(0.25rem, 1vw + 2px, 0.75rem)',
				'sidenote-callout-before-content': '"A < & >"'
			})
			for (const selector of [darkEditor, systemDark])
				expectThemeVariables(cssA, selector, { 'color-primary': '#2468ac' })
			expect(cssA).toContain('font-family: "Runtime Sans A";')
			expect(cssA).toContain('src: url("/fonts/runtime-a.woff2") format(\'woff2\');')
			// Literal editor.background/editor.foreground values from the declared Shiki sources.
			expectThemeVariables(cssA, lightEditor, {
				'editor-background': '#fff',
				'editor-foreground': '#24292e'
			})
			for (const selector of [darkEditor, systemDark])
				expectThemeVariables(cssA, selector, {
					'editor-background': '#24292e',
					'editor-foreground': '#e1e4e8'
				})

			const config = JSON.parse(original.toString('utf8'))
			config.theme = {
				light: { 'color-primary': '#a13579' },
				dark: { 'color-primary': '#b24680' },
				globals: {
					'font-sans-name': '"Runtime Sans B"',
					'font-sans-url': '"/fonts/runtime-b.woff2"',
					'font-sans-weight': '400 700',
					'radius-small': 'calc(1rem + 3px)'
				},
				markdown: {
					code: { light: 'rose-pine-dawn', dark: 'rose-pine' },
					sidenote: {
						'sidenote-callout-before-content': '"B < & > </style> </StYlE> </span>"'
					}
				}
			}
			await writeFile(configFilename, JSON.stringify(config))
			expect(await pageTheme()).toBe(cssA)
			expect(await pageTheme()).toBe(cssA)
			await stopBuiltApp()
			origin = await startBuiltApp()

			const cssB = await pageTheme()
			expect(cssB).not.toBe(cssA)
			expectThemeVariables(cssB, ':root', {
				'color-primary': '#a13579',
				'font-sans-name': '"Runtime Sans B"',
				'radius-small': 'calc(1rem + 3px)',
				'sidenote-callout-before-content': '"B < & > <\\/style> <\\/StYlE> </span>"'
			})
			for (const selector of [darkEditor, systemDark])
				expectThemeVariables(cssB, selector, { 'color-primary': '#b24680' })
			expect(cssB).toContain('font-family: "Runtime Sans B";')
			expect(cssB).toContain('font-weight: 400 700;')
			expect(cssB).toContain('src: url("/fonts/runtime-b.woff2") format(\'woff2\');')
			expect(cssB).not.toContain('#135790')
			expect(cssB).not.toContain('#2468ac')
			expect(cssB).not.toContain('Runtime Sans A')
			expectThemeVariables(cssB, lightEditor, {
				'editor-background': '#faf4ed',
				'editor-foreground': '#575279'
			})
			for (const selector of [darkEditor, systemDark])
				expectThemeVariables(cssB, selector, {
					'editor-background': '#191724',
					'editor-foreground': '#e0def4'
				})
			expect(await machineFeedSnapshot()).toEqual(originalMachineFeeds)
			const api = await request('/api/pieces?type=cutover-kind', 'application/json')
			expect(api.status).toBe(200)
			const body = await api.text()
			expect(body).not.toContain('data-luzzle-configured-styles')
			expect(body).not.toContain('--editor-background:')
			expect(body).not.toContain('--color-primary:')
			expect(JSON.parse(body).pieces).toEqual([originalPublicPiece])
		} finally {
			await stopBuiltApp()
			await writeFile(configFilename, original)
			origin = await startBuiltApp()
		}
	})

	test('keeps mapped page data, assets, tags, navigation and SEO useful in native SSR', async () => {
		const html = await pageHtml()
		expectBuiltIn(html)
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

	test('rejects retired piece source configuration rather than reading arbitrary Svelte', async () => {
		const original = await readFile(configFilename, 'utf8')
		for (const role of ['icon', 'page', 'opengraph']) {
			try {
				const config = JSON.parse(original)
				config.pieces[0].components = { [role]: './must-not-be-read.svelte' }
				await writeFile(configFilename, JSON.stringify(config))
				await expect(validateRuntimeConfig()).rejects.toMatchObject({
					code: 1,
					stderr: expect.stringContaining('components')
				})
			} finally {
				await writeFile(configFilename, original)
			}
		}
	})

	test.each([
		{ section: 'content', key: 'component', value: { root: './must-not-be-read.svelte' } },
		{ section: 'paths', key: 'prepared', value: './must-not-be-created' }
	])(
		'rejects retired $key setting in $section through the runtime configuration loader',
		async ({ section, key, value }) => {
			const original = await readFile(configFilename, 'utf8')
			try {
				const config = JSON.parse(original)
				config[section][key] = value
				await writeFile(configFilename, JSON.stringify(config))
				await expect(validateRuntimeConfig()).rejects.toMatchObject({
					code: 1,
					stderr: expect.stringContaining(`/${section}/${key}`)
				})
			} finally {
				await writeFile(configFilename, original)
			}
		}
	)

	test('preserves anonymous admin redirects and private JSON denials', async () => {
		for (const pathname of [
			'/admin/piece/real-piece.cutover-kind.md/published/page',
			'/admin/piece/real-piece.cutover-kind.md/preview/selected-job/page',
			'/admin/open/cutover-kind/real-piece',
			'/admin/open/unconfigured-kind/real-piece'
		]) {
			const browser = await request(pathname)
			expect(browser.status).toBe(302)
			expect(browser.headers.get('location')).toBe('/')
			const api = await request(pathname, 'application/json')
			expect(api.status).toBe(403)
			expect(api.headers.get('cache-control')).toBe('private, no-store')
			expect(await api.text()).not.toContain('data-luzzle-configured-styles')
		}
	})

	test('stock home keeps type links in its introduction and only queries configured published types', async () => {
		const html = await pageHtml('/')
		expect(html).toMatch(/<h1[^>]*>luzzle pieces<\/h1>/)
		expect(html).toContain('class="type-link"')
		expect(html).toMatch(/<h2[^>]*>latest<\/h2>/)
		expect(html).not.toMatch(/<h2[^>]*>random<\/h2>/)
		expect(html).toContain('Real Piece')
		expect(html).not.toContain('Orphan must not be visible')
	})

	test.each([
		{ label: 'latest only', latest: true, random: false, headings: ['latest'] },
		{ label: 'random only', latest: false, random: true, headings: ['random'] },
		{ label: 'both lists disabled', latest: false, random: false, headings: [] },
		{
			label: 'latest consumes the only eligible piece, leaving random empty',
			latest: true,
			random: true,
			headings: ['latest']
		}
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
		expect(html.includes('Orphan must not be visible')).toBe(false)
		expect(html).not.toContain(directory)
	})

	test.each([
		[false, false],
		[true, false],
		[false, true],
		[true, true]
	])(
		'native feed about=%s/links=%s preserve all feed kinds and discovery',
		async (about, links) => {
			await writeFile(
				path.join(directory, 'sections/about.md'),
				'## What is this?\n\nA [normal link](/pieces).'
			)
			await restartWithPages({ feed: { ...(about ? { about: 'sections/about.md' } : {}), links } })
			for (const feed of feedCases) {
				const html = await pageHtml(`${feed.folder}/feed.html`)
				expectNativeFeed(html, feed, about, links)
				if (about) expect(html).toContain('<h2>What is this?</h2>')
			}
		}
	)

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
		expect(html).not.toContain(directory)
		expect(expectInlineConfiguredCss(html)).toContain('--color-primary: #135790;')
	})

	test('Markdown image URLs do not publish neighboring filesystem assets', async () => {
		await writeFile(path.join(directory, 'sections/image.md'), '![Private neighbor](neighbor.png)')
		await writeFile(path.join(directory, 'sections/neighbor.png'), 'not a public asset')
		await restartWithPages({ feed: { about: 'sections/image.md' } })
		expect(await pageHtml('/rss/pieces/feed.html')).toContain('src="neighbor.png"')
		expect((await request('/rss/pieces/neighbor.png')).status).toBe(404)
	})

	test('site section settings preserve machine-feed metadata and item data', async () => {
		await restartWithPages({ feed: { links: false } })
		for (const feed of feedCases)
			expectNativeFeed(await pageHtml(`${feed.folder}/feed.html`), feed, false, false)
		expect(await machineFeedSnapshot()).toEqual(originalMachineFeeds)
	})

	test('leaves piece data and every built adapter file unchanged after runtime content/config changes', async () => {
		expectBuiltIn(await pageHtml())
		const response = await request('/api/pieces?type=cutover-kind', 'application/json')
		expect((await response.json()).pieces).toEqual([originalPublicPiece])
		expect(await buildHashes()).toEqual(originalBuild)
	})
})
