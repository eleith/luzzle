import { afterEach, beforeEach, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const entry = fileURLToPath(new URL('./start-server.js', import.meta.url))
const cache = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url))
let directory: string

beforeEach(async () => {
	await mkdir(cache, { recursive: true })
	// Spaces and # also exercise conversion of the compiled entry path to a file URL.
	directory = await mkdtemp(path.join(cache, 'server-startup #-'))
	await mkdir(path.join(directory, 'build'))
	// Snapshot at module evaluation: the entry must apply the environment before import.
	// Never print the entire environment or any auth secrets in the child fixture.
	await writeFile(
		path.join(directory, 'build/index.js'),
		'console.log(JSON.stringify({HOST:process.env.HOST,ORIGIN:process.env.ORIGIN,AUTH_URL:process.env.AUTH_URL,NEXTAUTH_URL:process.env.NEXTAUTH_URL}))'
	)
})

afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

function run(environment: NodeJS.ProcessEnv = {}) {
	const inherited = { ...process.env }
	for (const key of ['HOST', 'ORIGIN', 'AUTH_URL', 'NEXTAUTH_URL']) delete inherited[key]
	return exec(process.execPath, [entry], {
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

test('loads working-directory config and applies the canonical environment before importing the server', async () => {
	await configure()
	const { stdout } = await run({ HOST: 'ignored-host' })
	expect(JSON.parse(stdout)).toEqual({
		HOST: '127.0.0.1',
		ORIGIN: 'https://startup.example',
		AUTH_URL: 'https://startup.example'
	})
})

test('normalizes explicit ORIGIN instead of replacing it with the configured app origin', async () => {
	await configure()
	const { stdout } = await run({ ORIGIN: 'http://Override.EXAMPLE:80/' })
	expect(JSON.parse(stdout)).toEqual({
		HOST: '127.0.0.1',
		ORIGIN: 'http://override.example',
		AUTH_URL: 'http://override.example'
	})
})

test('preserves an explicit empty ORIGIN without deriving an auth URL', async () => {
	await configure()
	const { stdout } = await run({ ORIGIN: '' })
	expect(JSON.parse(stdout)).toEqual({ HOST: '127.0.0.1', ORIGIN: '' })
})

test.each(['', '/garden', './garden', '//relative.example/garden'])(
	'leaves app URL %s request-derived before importing the server',
	async (app) => {
		await configure(app)
		const { stdout } = await run()
		expect(JSON.parse(stdout)).toEqual({ HOST: '127.0.0.1' })
	}
)

test('does not add an auth URL when authentication is disabled', async () => {
	await configure(undefined, false)
	const { stdout } = await run()
	expect(JSON.parse(stdout)).toEqual({
		HOST: '127.0.0.1',
		ORIGIN: 'https://startup.example'
	})
})

test('uses the existing HOST fallback for an empty configured bind host', async () => {
	await configure(undefined, true, '')
	const { stdout } = await run()
	expect(JSON.parse(stdout)).toEqual({
		HOST: '0.0.0.0',
		ORIGIN: 'https://startup.example',
		AUTH_URL: 'https://startup.example'
	})
})

test.each([
	{ AUTH_URL: 'https://auth.example/custom/path' },
	{ AUTH_URL: '' },
	{ NEXTAUTH_URL: 'https://legacy.example/custom/path' },
	{ NEXTAUTH_URL: '' },
	{ AUTH_URL: '', NEXTAUTH_URL: '' },
	{ AUTH_URL: 'https://auth.example', NEXTAUTH_URL: 'https://legacy.example' }
])(
	'preserves explicit auth URL settings without changing NEXTAUTH_URL: %j',
	async (environment) => {
		await configure()
		const { stdout } = await run(environment)
		expect(JSON.parse(stdout)).toEqual({
			HOST: '127.0.0.1',
			ORIGIN: 'https://startup.example',
			...environment
		})
	}
)

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

test.each([
	'https://override.example/private-token',
	'https://user:private-password@override.example',
	'javascript:private-token'
])('rejects invalid explicit ORIGIN %s before importing the server', async (ORIGIN) => {
	await configure()
	await expect(run({ ORIGIN })).rejects.toMatchObject({
		code: 1,
		stdout: '',
		stderr: expect.stringContaining('Invalid ORIGIN:')
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
