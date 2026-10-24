import { expect, test } from 'vitest'
import { lstat, readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parse } from 'yaml'

const web = fileURLToPath(new URL('../', import.meta.url))

test.each([
	['docker-compose.dev.yml', 'luzzle-dev-web', '/m/apps/web/config'],
	['docker-compose.dev.yml', 'luzzle-dev-worker', '/m/packages/web/worker/config'],
	['docker-compose.yml', 'luzzle-web', '/app/config'],
	['docker-compose.yml', 'luzzle-worker', '/app/config']
])('%s mounts a read-only config directory for %s', async (filename, service, target) => {
	const compose = parse(await readFile(path.join(web, filename), 'utf8'))
	const volumes: string[] = compose.services[service].volumes
	expect(volumes).toContain(`./demo/config:${target}:ro`)
	expect(volumes.some((volume) => volume.startsWith('./demo/config.yaml:'))).toBe(false)
})

test('the demo configuration is a regular file in its mounted directory', async () => {
	const canonical = path.join(web, 'demo/config/config.yaml')
	expect((await lstat(canonical)).isFile()).toBe(true)
})

test('the standalone demo runtime copies the Markdown files referenced by its config', async () => {
	const config = parse(await readFile(path.join(web, 'demo/config/config.yaml'), 'utf8'))
	const dockerfile = await readFile(path.join(web, 'demo/Dockerfile'), 'utf8')
	const runtime = dockerfile.slice(dockerfile.lastIndexOf('\nFROM '))
	const copy = runtime
		.split('\n')
		.find((line) => line.startsWith('COPY ') && line.endsWith(' ./content/'))
	expect(copy).toBeDefined()
	for (const filename of [config.pages.home.body, config.pages.feed.about]) {
		const source = filename.replace(/^\.\//, '')
		expect(copy!.split(/\s+/)).toContain(source)
		expect((await stat(path.join(web, 'demo', source))).isFile()).toBe(true)
	}
})

test('the schema header resolves from the canonical editable config location', async () => {
	const canonical = path.join(web, 'demo/config/config.yaml')
	const source = await readFile(canonical, 'utf8')
	const schema = source.match(/^# yaml-language-server: \$schema=(.+)$/m)?.[1]
	expect(schema).toBeDefined()
	expect((await stat(path.resolve(path.dirname(canonical), schema!))).isFile()).toBe(true)
})
