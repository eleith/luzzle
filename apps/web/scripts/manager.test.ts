import { afterEach, beforeEach, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import {
	mkdir,
	mkdtemp,
	readFile,
	readlink,
	rename,
	rm,
	symlink,
	writeFile
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const manager = fileURLToPath(new URL('./manager.js', import.meta.url))
const launcher = fileURLToPath(new URL('./start-server.js', import.meta.url))
const absoluteEnvironment = {
	HOST: '127.0.0.1',
	PROTOCOL_HEADER: 'x-luzzle-public-protocol',
	HOST_HEADER: 'x-luzzle-public-authority',
	PORT_HEADER: ''
}
const cache = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url))
let directory: string

beforeEach(async () => {
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'manager-startup-'))
	await Promise.all(['bin', 'build', 'data'].map((name) => mkdir(path.join(directory, name))))
	// Stub only the package-manager subprocess. The real manager and config loader run in Node.
	await writeFile(
		path.join(directory, 'bin/pnpm'),
		'#!/bin/sh\nprintf "manager-command %s\\n" "$*"\n',
		{ mode: 0o755 }
	)
})

afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

function run(dev = true, environment: NodeJS.ProcessEnv = {}) {
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
	return exec(process.execPath, [manager], {
		cwd: directory,
		env: {
			...inherited,
			LUZZLE_DEV: String(dev),
			PATH: `${path.join(directory, 'bin')}${path.delimiter}${process.env.PATH}`,
			...environment
		},
		timeout: 10000
	})
}

async function configure(app = 'https://manager.example/garden', authenticated = false) {
	const config: Record<string, unknown> = {
		url: { app },
		network: { public: { host: '127.0.0.1' } }
	}
	if (authenticated) {
		config.auth = {
			secret: 'private-session-secret',
			credentials: { username: 'admin', password: 'private-password' }
		}
	}
	await writeFile(path.join(directory, 'config.yaml'), JSON.stringify(config))
}

test('development startup loads config from the mounted working directory without an /app alias', async () => {
	await configure()
	const { stdout } = await run()
	expect(stdout).toContain('Config App URL: https://manager.example/garden')
	expect(stdout).toContain('Running in development mode...')
	expect(stdout).toContain('manager-command run dev -- --host')
	expect(stdout).not.toContain('Initiating production build sequence')
})

test('production delegates to the absolute real launcher with build and log files in the working directory', async () => {
	await configure()
	await writeFile(
		path.join(directory, 'build/index.js'),
		`import { createServer } from 'node:http'
export const server = createServer()
console.log("manager-server " + JSON.stringify({
	cwd:process.cwd(),host:process.env.HOST,launcher:process.argv[1]
}))`
	)
	const { stdout } = await run(false)
	expect(stdout).toContain('manager-command run build')
	expect(stdout).toContain(
		`manager-server ${JSON.stringify({ cwd: directory, host: '127.0.0.1', launcher })}`
	)
	const log = await readFile(path.join(directory, 'data/build.log'), 'utf8')
	expect(log).toContain('Config App URL: https://manager.example/garden')
	expect(log).toContain('Build completed successfully.')
})

test('fresh production startups follow the compatibility link after atomic config replacement', async () => {
	const filename = path.join(directory, 'config.yaml')
	const target = path.join(directory, 'config/config.yaml')
	await configure()
	await mkdir(path.join(directory, 'config'))
	await rename(filename, target)
	await symlink('config/config.yaml', filename)
	await writeFile(
		path.join(directory, 'build/index.js'),
		`import { createServer } from 'node:http'
export const server = createServer()
console.log("manager-server " + JSON.stringify({cwd:process.cwd(),host:process.env.HOST}))`
	)

	// Each run is a fresh manager process, not a live-server config reload.
	async function checkStartup(app: string, host: string) {
		const { stdout } = await run(false)
		expect(await readlink(filename)).toBe('config/config.yaml')
		expect(stdout).toContain(`Config App URL: ${app}`)
		expect(stdout).toContain('manager-command run build')
		expect(stdout).toContain(`manager-server ${JSON.stringify({ cwd: directory, host })}`)
		const log = await readFile(path.join(directory, 'data/build.log'), 'utf8')
		expect(log).toContain(`Config App URL: ${app}`)
		expect(log).toContain('Build completed successfully.')
	}

	await checkStartup('https://manager.example/garden', '127.0.0.1')
	const app = 'https://replacement.example/garden'
	const host = '0.0.0.0'
	const temporary = path.join(directory, 'config/config.next.yaml')
	await writeFile(temporary, JSON.stringify({ url: { app }, network: { public: { host } } }))
	await rename(temporary, target)
	await checkStartup(app, host)
}, 25000)

test('startup still fails when the working-directory config is missing', async () => {
	await expect(run()).rejects.toMatchObject({
		code: 1,
		stdout: expect.stringContaining(path.join(directory, 'config.yaml'))
	})
})

async function captureServerEnvironment() {
	await writeFile(
		path.join(directory, 'build/index.js'),
		`import { createServer } from 'node:http'
// Keep the native export unbound so this environment snapshot exits naturally.
export const server = createServer()
console.log("manager-environment " + JSON.stringify({
	HOST:process.env.HOST,ORIGIN:process.env.ORIGIN,
	PROTOCOL_HEADER:process.env.PROTOCOL_HEADER,HOST_HEADER:process.env.HOST_HEADER,
	PORT_HEADER:process.env.PORT_HEADER
}))`
	)
}

test('production selects internal protocol and authority headers from configured url.app', async () => {
	await configure('https://Manager.EXAMPLE:443/garden/', true)
	await captureServerEnvironment()
	const { stdout } = await run(false)
	expect(stdout).toContain('manager-command run build')
	expect(stdout).toContain(`manager-environment ${JSON.stringify(absoluteEnvironment)}`)
})

test('production uses YAML even when ambient URL variables disagree', async () => {
	await configure(undefined, true)
	await captureServerEnvironment()
	const { stdout } = await run(false, {
		ORIGIN: 'not-a-url',
		PROTOCOL_HEADER: 'x-forwarded-proto',
		HOST_HEADER: 'x-forwarded-host',
		PORT_HEADER: 'x-forwarded-port',
		BETTER_AUTH_URL: 'https://unexpected.example',
		AUTH_URL: '',
		NEXTAUTH_URL: ''
	})
	expect(stdout).toContain(`manager-environment ${JSON.stringify(absoluteEnvironment)}`)
})

test.each(['', '/garden'])(
	'production keeps app URL %s request-derived and clears ambient ORIGIN',
	async (app) => {
		await configure(app, false)
		await captureServerEnvironment()
		const { stdout } = await run(false, {
			ORIGIN: 'https://unexpected.example',
			PROTOCOL_HEADER: 'x-forwarded-proto'
		})
		expect(stdout).toContain(
			`manager-environment ${JSON.stringify({
				HOST: '127.0.0.1',
				PROTOCOL_HEADER: 'x-forwarded-proto'
			})}`
		)
	}
)

test('production selects configured header settings even with authentication disabled', async () => {
	await configure()
	await captureServerEnvironment()
	const { stdout } = await run(false)
	expect(stdout).toContain(`manager-environment ${JSON.stringify(absoluteEnvironment)}`)
})

test('development selects the same internal headers from YAML and clears ambient ORIGIN', async () => {
	await configure(undefined, true)
	await writeFile(
		path.join(directory, 'bin/pnpm'),
		'#!/bin/sh\nprintf "manager-environment HOST=%s ORIGIN=%s PROTOCOL_HEADER=%s HOST_HEADER=%s PORT_HEADER=%s\\n" "$HOST" "${ORIGIN-unset}" "$PROTOCOL_HEADER" "$HOST_HEADER" "${PORT_HEADER-unset}"\n',
		{ mode: 0o755 }
	)
	const { stdout } = await run(true, { ORIGIN: 'https://unexpected.example' })
	expect(stdout).toContain(
		'manager-environment HOST=127.0.0.1 ORIGIN=unset PROTOCOL_HEADER=x-luzzle-public-protocol HOST_HEADER=x-luzzle-public-authority PORT_HEADER=\n'
	)
	expect(stdout).not.toContain('Initiating production build sequence')
})

test('production rejects unsafe configured URLs before logging values, building or spawning Node', async () => {
	await configure('https://user:private-password@manager.example/garden', true)
	await captureServerEnvironment()
	await expect(run(false)).rejects.toMatchObject({
		code: 1,
		stdout: 'FATAL ERROR: Invalid url.app: expected an HTTP(S) URL without credentials\n'
	})
	const log = await readFile(path.join(directory, 'data/build.log'), 'utf8')
	expect(log).toContain('FATAL ERROR: Invalid url.app:')
	expect(log).not.toContain('private-password')
	expect(log).not.toContain('private-session-secret')
})

test('authenticated production rejects relative app URLs instead of using an ambient origin', async () => {
	await configure('/garden', true)
	await expect(
		run(false, {
			ORIGIN: 'https://unexpected.example',
			BETTER_AUTH_URL: 'https://unexpected.example',
			AUTH_URL: 'https://legacy.example'
		})
	).rejects.toMatchObject({
		code: 1,
		stdout: 'FATAL ERROR: Authentication requires an absolute url.app\n'
	})
})
