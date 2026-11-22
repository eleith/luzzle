import { afterEach, beforeEach, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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
	await mkdir(path.join(directory, 'bin'))
	// Run the real launcher/config loader, capturing only the environment handed to Vite.
	await writeFile(
		path.join(directory, 'bin/pnpm'),
		`#!${process.execPath}
console.log(JSON.stringify({
	devMode: process.env.LUZZLE_DEV,
	dev: JSON.parse(process.env.LUZZLE_DEV_SERVER),
	pages: JSON.parse(process.env.LUZZLE_PAGE_TEMPLATES),
	icons: JSON.parse(process.env.LUZZLE_ICON_TEMPLATES),
	host: process.env.HOST,
	origin: process.env.ORIGIN,
	protocolHeader: process.env.PROTOCOL_HEADER,
	hostHeader: process.env.HOST_HEADER
}))
`,
		{ mode: 0o755 }
	)
})

afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

function run() {
	return exec(process.execPath, [manager], {
		cwd: directory,
		env: {
			...process.env,
			PATH: `${path.join(directory, 'bin')}${path.delimiter}${process.env.PATH}`,
			ORIGIN: 'https://ambient.example',
			LUZZLE_DEV: undefined,
			LUZZLE_DEV_SERVER: '{"allowedHosts":true}',
			LUZZLE_PAGE_TEMPLATES: 'ignored-map',
			LUZZLE_ICON_TEMPLATES: 'ignored-map'
		},
		timeout: 10000
	})
}

test('development reads working-directory YAML and supplies networking and public routing before Vite starts', async () => {
	await writeFile(
		path.join(directory, 'config.yaml'),
		JSON.stringify({
			url: { app: 'https://manager.example:8443/garden' },
			network: { public: { host: '127.0.0.1', hmr_port: 8443 } },
			pieces: [
				{
					type: 'words',
					fields: { title: 'private.title', date_consumed: 'date' },
					templates: { page: { name: 'note' }, icon: { name: 'lined-notebook-paper' } }
				}
			]
		})
	)
	const { stdout } = await run()
	const environment = JSON.parse(stdout.trim().split('\n').at(-1)!)
	expect(environment).toEqual({
		devMode: 'true',
		dev: {
			appOrigin: 'https://manager.example:8443',
			host: '127.0.0.1',
			allowedHosts: ['localhost', 'manager.example', 'luzzle-web'],
			hmr: { clientPort: 8443 }
		},
		pages: { words: 'note' },
		icons: { words: 'lined-notebook-paper' },
		host: '127.0.0.1',
		protocolHeader: 'x-luzzle-public-protocol',
		hostHeader: 'x-luzzle-public-authority'
	})
})

test('missing working-directory config fails before starting Vite', async () => {
	await expect(run()).rejects.toMatchObject({
		code: 1,
		stdout: '',
		stderr: expect.stringContaining(path.join(directory, 'config.yaml'))
	})
})
