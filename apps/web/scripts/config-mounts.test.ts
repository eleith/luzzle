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

test('development mounts the Vite configuration without the retired Svelte config', async () => {
	const compose = parse(await readFile(path.join(web, 'docker-compose.dev.yml'), 'utf8'))
	const volumes: string[] = compose.services['luzzle-dev-web'].volumes
	expect(volumes).toContain('./vite.config.ts:/m/apps/web/vite.config.ts')
	expect(volumes.some((volume) => volume.startsWith('./svelte.config.js:'))).toBe(false)
})

test('the demo configuration is a regular file in its mounted directory', async () => {
	const canonical = path.join(web, 'demo/config/config.yaml')
	expect((await lstat(canonical)).isFile()).toBe(true)
})

test('the schema header resolves from the canonical editable config location', async () => {
	const canonical = path.join(web, 'demo/config/config.yaml')
	const source = await readFile(canonical, 'utf8')
	const schema = source.match(/^# yaml-language-server: \$schema=(.+)$/m)?.[1]
	expect(schema).toBeDefined()
	expect((await stat(path.resolve(path.dirname(canonical), schema!))).isFile()).toBe(true)
})
