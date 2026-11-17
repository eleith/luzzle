import { afterEach, beforeEach, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rename, rm, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const entry = fileURLToPath(new URL('./start-server.js', import.meta.url))
const cache = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url))
const absoluteEnvironment = {
	HOST: '127.0.0.1',
	PROTOCOL_HEADER: 'x-luzzle-public-protocol',
	HOST_HEADER: 'x-luzzle-public-authority',
	PORT_HEADER: '',
	LUZZLE_PAGE_TEMPLATES: '{"words":"note","books":"default"}',
	LUZZLE_ICON_TEMPLATES: '{"words":"lined-notebook-paper","books":"default"}'
}
let directory: string

beforeEach(async () => {
	await mkdir(cache, { recursive: true })
	// Spaces and # also exercise conversion of the compiled entry path to a file URL.
	directory = await mkdtemp(path.join(cache, 'server-startup #-'))
	await mkdir(path.join(directory, 'build'))
	// Snapshot at module evaluation: the entry must apply the environment before import.
	// Export the native Node server, unbound so this snapshot fixture exits naturally.
	// Never print the entire environment or any auth secrets in the child fixture.
	await writeFile(
		path.join(directory, 'build/index.js'),
		`import { createServer } from 'node:http'
export const server = createServer()
console.log(JSON.stringify({
	HOST:process.env.HOST,ORIGIN:process.env.ORIGIN,
	PROTOCOL_HEADER:process.env.PROTOCOL_HEADER,HOST_HEADER:process.env.HOST_HEADER,
	PORT_HEADER:process.env.PORT_HEADER,
	LUZZLE_PAGE_TEMPLATES:process.env.LUZZLE_PAGE_TEMPLATES,
	LUZZLE_ICON_TEMPLATES:process.env.LUZZLE_ICON_TEMPLATES
}))`
	)
})

afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

function run(environment: NodeJS.ProcessEnv = {}, args = [entry]) {
	const inherited = { ...process.env }
	for (const key of [
		'HOST',
		'LUZZLE_PAGE_TEMPLATES',
		'LUZZLE_ICON_TEMPLATES',
		'ORIGIN',
		'PROTOCOL_HEADER',
		'HOST_HEADER',
		'PORT_HEADER',
		'BETTER_AUTH_URL',
		'AUTH_URL',
		'NEXTAUTH_URL'
	])
		delete inherited[key]
	return exec(process.execPath, args, {
		cwd: directory,
		env: { ...inherited, ...environment },
		timeout: 10000
	})
}

async function configure(app = 'https://Startup.EXAMPLE:443/garden/', authenticated = true) {
	const config: Record<string, unknown> = {
		url: { app },
		network: { public: { host: '127.0.0.1' } },
		pieces: [
			{
				type: 'words',
				fields: { title: 'private.title', date_consumed: 'date' },
				templates: { page: { name: 'note' }, icon: { name: 'lined-notebook-paper' } }
			},
			{ type: 'books', fields: { title: 'title', date_consumed: 'date' } }
		]
	}
	if (authenticated) {
		config.auth = {
			secret: 'private-session-secret',
			credentials: { username: 'admin', password: 'private-password' }
		}
	}
	await writeFile(path.join(directory, 'config.yaml'), JSON.stringify(config))
}

test('working-directory YAML overrides ambient settings before importing the server', async () => {
	await configure()
	const { stdout } = await run({
		HOST: 'ignored-host',
		LUZZLE_PAGE_TEMPLATES: 'ignored-map',
		LUZZLE_ICON_TEMPLATES: 'ignored-map',
		ORIGIN: 'not-a-url',
		PROTOCOL_HEADER: 'x-forwarded-proto',
		HOST_HEADER: 'x-forwarded-host',
		PORT_HEADER: 'x-forwarded-port',
		BETTER_AUTH_URL: 'https://unexpected.example',
		AUTH_URL: 'https://legacy.example',
		NEXTAUTH_URL: ''
	})
	expect(JSON.parse(stdout)).toEqual(absoluteEnvironment)
})

test('a public relative app URL stays request-derived despite ambient ORIGIN', async () => {
	await configure('/garden', false)
	const { stdout } = await run({
		ORIGIN: 'https://unexpected.example',
		PROTOCOL_HEADER: 'x-forwarded-proto'
	})
	expect(JSON.parse(stdout)).toEqual({
		HOST: '127.0.0.1',
		PROTOCOL_HEADER: 'x-forwarded-proto',
		LUZZLE_PAGE_TEMPLATES: absoluteEnvironment.LUZZLE_PAGE_TEMPLATES,
		LUZZLE_ICON_TEMPLATES: absoluteEnvironment.LUZZLE_ICON_TEMPLATES
	})
})

test('fresh production startups follow the compatibility symlink after atomic config replacement', async () => {
	await configure()
	const filename = path.join(directory, 'config.yaml')
	const target = path.join(directory, 'config/config.yaml')
	await mkdir(path.dirname(target))
	await rename(filename, target)
	await symlink('config/config.yaml', filename)

	const first = await run()
	expect(JSON.parse(first.stdout)).toEqual(absoluteEnvironment)

	const replacement = path.join(directory, 'config/config.next.yaml')
	await writeFile(
		replacement,
		JSON.stringify({
			url: { app: 'https://replacement.example/garden' },
			network: { public: { host: '0.0.0.0' } },
			pieces: [
				{
					type: 'words',
					fields: { title: 'title', date_consumed: 'date' },
					templates: { page: { name: 'default' }, icon: { name: 'default' } }
				}
			]
		})
	)
	await rename(replacement, target)

	// Restart the actual launcher: this is not a live-server config reload.
	const second = await run()
	expect(JSON.parse(second.stdout)).toEqual({
		...absoluteEnvironment,
		HOST: '0.0.0.0',
		LUZZLE_PAGE_TEMPLATES: '{"words":"default"}',
		LUZZLE_ICON_TEMPLATES: '{"words":"default"}'
	})
})

test('import alone exports startServer without loading config or starting the default entry', async () => {
	// No config exists; the default entry would print a different snapshot if imported.
	const { stdout, stderr } = await run({}, [
		'--input-type=module',
		'--eval',
		`const { startServer } = await import(${JSON.stringify(pathToFileURL(entry).href)})
console.log(typeof startServer)`
	])
	expect(stdout).toBe('function\n')
	expect(stderr).toBe('')
})

test('a public absolute URL normalizes the first HTTP request on the returned native server', async () => {
	const app = 'https://Public.EXAMPLE:8443/garden'
	await configure(app, false)
	const compiledEntry = path.join(directory, 'build/probe #.js')
	// Native transport probe; Kit's pre-handle behavior belongs in production HTTP tests.
	await writeFile(
		compiledEntry,
		`import { createServer } from 'node:http'
export const server = createServer(async (request, response) => {
	const protocol = request.headers[process.env.PROTOCOL_HEADER]
	const authority = request.headers[process.env.HOST_HEADER]
	const url = new URL(request.url, protocol + '://' + authority).href
	let body = ''
	for await (const chunk of request) body += chunk
	response.setHeader('content-type', 'application/json')
	response.end(JSON.stringify({ url, method: request.method, origin: request.headers.origin, body }))
})
server.listen(0, '127.0.0.1')`
	)
	const { stdout } = await run({ ORIGIN: 'https://ambient.example' }, [
		'--input-type=module',
		'--eval',
		`import { request } from 'node:http'
import { once } from 'node:events'
const { startServer } = await import(${JSON.stringify(pathToFileURL(entry).href)})
const server = await startServer(${JSON.stringify(compiledEntry)})
const compiled = await import(${JSON.stringify(pathToFileURL(compiledEntry).href)})
if (server !== compiled.server) throw new Error('Native server was replaced')
try {
	if (!server.listening) await once(server, 'listening')
	const result = await new Promise((resolve, reject) => {
		const outgoing = request({
			hostname: '127.0.0.1', port: server.address().port, agent: false,
			method: 'POST', path: '/submit?next=%2Fprivate&tag=a&tag=b',
			headers: {
				host: 'internal.example:3000', origin: 'https://browser.example',
				'content-type': 'application/x-www-form-urlencoded',
				'x-luzzle-public-protocol': 'http',
				'x-luzzle-public-authority': 'spoofed.example:9999'
			}
		}, async (response) => {
			try {
				let body = ''
				for await (const chunk of response) body += chunk
				resolve(JSON.parse(body))
			} catch (error) { reject(error) }
		})
		outgoing.on('error', reject)
		outgoing.end('title=one%26two&tag=a&tag=b')
	})
	console.log(JSON.stringify(result))
} finally {
	await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
}`
	])
	expect(JSON.parse(stdout)).toEqual({
		url: 'https://public.example:8443/submit?next=%2Fprivate&tag=a&tag=b',
		method: 'POST',
		origin: 'https://browser.example',
		body: 'title=one%26two&tag=a&tag=b'
	})
}, 15000)

test('authentication requires an absolute configured app URL before server import', async () => {
	await configure('/garden')
	await expect(
		run({
			ORIGIN: 'https://unexpected.example',
			BETTER_AUTH_URL: 'https://unexpected.example',
			AUTH_URL: 'https://legacy.example'
		})
	).rejects.toMatchObject({
		code: 1,
		stdout: '',
		stderr: expect.stringContaining('Authentication requires an absolute url.app')
	})
})

test('credential-bearing URLs fail before server import without exposing URL values or auth secrets', async () => {
	await configure('https://user:private-password@startup.example/private-token')
	try {
		await run()
		expect.fail('Expected startup validation to fail')
	} catch (error) {
		const failure = error as Error & { code: number; stdout: string; stderr: string }
		expect(failure.code).toBe(1)
		expect(failure.stdout).toBe('')
		expect(failure.stderr).toContain('Invalid url.app:')
		for (const value of [
			'private-password',
			'private-token',
			'private-session-secret',
			'startup.example'
		]) {
			expect(failure.stderr).not.toContain(value)
		}
	}
})

test('missing config exits naturally before importing the server', async () => {
	await expect(run()).rejects.toMatchObject({
		code: 1,
		stdout: '',
		stderr: expect.stringContaining(path.join(directory, 'config.yaml'))
	})
})
