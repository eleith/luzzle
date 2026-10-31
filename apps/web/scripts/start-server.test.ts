import { afterEach, beforeEach, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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
	PORT_HEADER: ''
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
	PORT_HEADER:process.env.PORT_HEADER
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

async function configure(
	app = 'https://Startup.EXAMPLE:443/garden/',
	authenticated = true,
	host = '127.0.0.1'
) {
	const config: Record<string, unknown> = {
		url: { app },
		network: { public: { host } }
	}
	if (authenticated) {
		config.auth = {
			secret: 'private-session-secret',
			credentials: { username: 'admin', password: 'private-password' }
		}
	}
	await writeFile(path.join(directory, 'config.yaml'), JSON.stringify(config))
}

test('loads working-directory config and applies internal header settings before importing the server', async () => {
	await configure()
	const { stdout } = await run({ HOST: 'ignored-host' })
	expect(JSON.parse(stdout)).toEqual(absoluteEnvironment)
})

test('configured url.app selects internal headers and clears ORIGIN despite ambient URL settings', async () => {
	await configure()
	const { stdout } = await run({
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

test.each(['', '/garden', './garden', '//relative.example/garden'])(
	'leaves app URL %s request-derived before importing the server',
	async (app) => {
		await configure(app, false)
		const { stdout } = await run({
			ORIGIN: 'https://unexpected.example',
			PROTOCOL_HEADER: 'x-forwarded-proto'
		})
		expect(JSON.parse(stdout)).toEqual({
			HOST: '127.0.0.1',
			PROTOCOL_HEADER: 'x-forwarded-proto'
		})
	}
)

test('uses configured header settings even when authentication is disabled', async () => {
	await configure(undefined, false)
	const { stdout } = await run()
	expect(JSON.parse(stdout)).toEqual(absoluteEnvironment)
})

test('uses the existing HOST fallback for an empty configured bind host', async () => {
	await configure(undefined, true, '')
	const { stdout } = await run()
	expect(JSON.parse(stdout)).toEqual({ ...absoluteEnvironment, HOST: '0.0.0.0' })
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

test.each(['https://Public.EXAMPLE:8443/garden', 'http://Other.EXAMPLE:8080/base'])(
	'startServer returns the native server and normalizes its first HTTP request using %s',
	async (app) => {
		await configure(app)
		const compiledEntry = path.join(directory, 'build/probe #.js')
		// This is a native HTTP transport probe, not proof of Kit pre-handle CSRF.
		// Like the adapter entry, it installs its request listener and starts listening on import.
		await writeFile(
			compiledEntry,
			`import { createServer } from 'node:http'
export const server = createServer(async (request, response) => {
	const protocol = request.headers[process.env.PROTOCOL_HEADER]
	const authority = request.headers[process.env.HOST_HEADER]
	const url = new URL(request.url, protocol + '://' + authority).href
	const headers = { ...request.headers }
	let body = ''
	for await (const chunk of request) body += chunk
	response.setHeader('content-type', 'application/json')
	response.end(JSON.stringify({ url, method: request.method, headers, body }))
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
	const results = []
	for (const origin of ['https://browser.example', 'null']) {
		results.push(await new Promise((resolve, reject) => {
			const outgoing = request({
				hostname: '127.0.0.1', port: server.address().port, agent: false,
				method: 'POST', path: '/submit?next=%2Fprivate&tag=a&tag=b',
				headers: {
					host: 'internal.example:3000', origin, cookie: 'session=unchanged',
					'content-type': 'application/x-www-form-urlencoded',
					'x-forwarded-proto': 'http', 'x-forwarded-host': 'spoofed.example:9999',
					'x-forwarded-port': '9999', 'x-luzzle-public-protocol': 'http',
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
		}))
	}
	console.log(JSON.stringify(results))
} finally {
	await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
}`
		])
		const canonical = new URL(app)
		const results = JSON.parse(stdout)
		expect(results).toHaveLength(2)
		for (const [index, origin] of ['https://browser.example', 'null'].entries()) {
			expect(results[index]).toEqual({
				url: `${canonical.origin}/submit?next=%2Fprivate&tag=a&tag=b`,
				method: 'POST',
				headers: expect.objectContaining({
					host: 'internal.example:3000',
					origin,
					cookie: 'session=unchanged',
					'content-type': 'application/x-www-form-urlencoded',
					'x-forwarded-proto': 'http',
					'x-forwarded-host': 'spoofed.example:9999',
					'x-forwarded-port': '9999',
					'x-luzzle-public-protocol': canonical.protocol.slice(0, -1),
					'x-luzzle-public-authority': canonical.host
				}),
				body: 'title=one%26two&tag=a&tag=b'
			})
		}
	},
	15000
)

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

test.each([
	'https://',
	'https:startup.example',
	'ftp://startup.example/private-token',
	'https://user:private-password@startup.example/garden'
])('rejects unsafe absolute app URL %s before importing the server', async (app) => {
	await configure(app)
	await expect(run()).rejects.toMatchObject({
		code: 1,
		stdout: '',
		stderr: expect.stringContaining('Invalid url.app: expected an HTTP(S) URL without credentials')
	})
})

test('validation errors do not log URL values or auth secrets', async () => {
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
