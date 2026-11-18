import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
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

// Isolated compiler fixture only: adapter-node6 exports the native HTTP server directly.
// Production origin/CSRF coverage lives in routes.test.ts and uses the real bootstrap.
const startServer = `
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
const { server } = await import(pathToFileURL(process.argv[1]).href);
if (!server.listening) await once(server, 'listening');
process.send({ port: server.address().port });
`

async function request(route = '') {
	const response = await fetch(`${origin}/${route}`, {
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
	configFilename = path.join(directory, 'config.yaml')
	await writeFile(
		configFilename,
		JSON.stringify({
			pieces: [{ type: 'custom-kind', fields: { title: 'title', date_consumed: 'date' } }]
		})
	)
	buildDirectory = path.join(directory, 'build')
	const env = {
		...process.env,
		NODE_ENV: 'production',
		TEMPLATE_BUILD_DIR: buildDirectory,
		TEMPLATE_KIT_DIR: path.join(directory, 'kit')
	}
	// Compile once to exercise framework error handling over native HTTP.
	await exec(process.execPath, [path.join(webRoot, 'node_modules/vite/bin/vite.js'), 'build'], {
		cwd: fixture,
		env,
		timeout: 60000,
		maxBuffer: 2 * 1024 * 1024
	})
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
		expect(await request()).toContain('Fixture healthy page')
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
	})
})
