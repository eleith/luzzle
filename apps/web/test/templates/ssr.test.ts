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
const [publisherUrl, configUrl, sourceFile, preparedDirectory, color, pieceType] = process.argv.slice(1);
const { publishTemplateBundle } = await import(publisherUrl);
const { validateConfig } = await import(configUrl);
const config = validateConfig({
 pieces: [{ type: pieceType, fields: { title: 'title', date_consumed: 'date' }, components: { page: sourceFile } }],
 theme: { light: { 'color-primary': color } }
});
config.paths.config = path.join(path.dirname(sourceFile), 'config.yaml');
console.log(JSON.stringify(await publishTemplateBundle(config, preparedDirectory)));
`

async function publishSource(source: string, color: string, type = 'custom-kind') {
	const filename = path.join(directory, `source-${sourceNumber++}.svelte`)
	await writeFile(filename, source)
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
			type
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
	const response = await fetch(`${origin}/${query}`, { signal: AbortSignal.timeout(10000) })
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
		expect(await request()).toContain('Built-in presentation')
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

	test('leaves every compiled application file unchanged across publication and fallback', async () => {
		expect(await buildHashes()).toEqual(originalBuild)
	})
})
