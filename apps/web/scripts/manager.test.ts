import { afterEach, beforeEach, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const manager = fileURLToPath(new URL('./manager.js', import.meta.url))
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

function run(dev = true) {
	return exec(process.execPath, [manager], {
		cwd: directory,
		env: {
			...process.env,
			LUZZLE_DEV: String(dev),
			PATH: `${path.join(directory, 'bin')}${path.delimiter}${process.env.PATH}`
		},
		timeout: 10000
	})
}

async function configure() {
	await writeFile(
		path.join(directory, 'config.yaml'),
		JSON.stringify({
			url: { app: 'https://manager.example/garden' },
			network: { public: { host: '127.0.0.1' } }
		})
	)
}

test('development startup loads config from the mounted working directory without an /app alias', async () => {
	await configure()
	const { stdout } = await run()
	expect(stdout).toContain('Config App URL: https://manager.example/garden')
	expect(stdout).toContain('Running in development mode...')
	expect(stdout).toContain('manager-command run dev -- --host')
	expect(stdout).not.toContain('Initiating production build sequence')
})

test('production startup uses build and log files in the same working directory', async () => {
	await configure()
	await writeFile(
		path.join(directory, 'build/index.js'),
		'console.log("manager-server " + JSON.stringify({cwd:process.cwd(),host:process.env.HOST}))'
	)
	const { stdout } = await run(false)
	expect(stdout).toContain('manager-command run build')
	expect(stdout).toContain(
		`manager-server ${JSON.stringify({ cwd: directory, host: '127.0.0.1' })}`
	)
	const log = await readFile(path.join(directory, 'data/build.log'), 'utf8')
	expect(log).toContain('Config App URL: https://manager.example/garden')
	expect(log).toContain('Build completed successfully.')
})

test('startup still fails when the working-directory config is missing', async () => {
	await expect(run()).rejects.toMatchObject({
		code: 1,
		stdout: expect.stringContaining(path.join(directory, 'config.yaml'))
	})
})
