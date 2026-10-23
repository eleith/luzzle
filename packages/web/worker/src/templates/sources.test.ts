import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateConfig } from '@luzzle/web.config'
import { readConfiguredTemplates } from './sources.js'

let directory: string

beforeEach(async () => {
	const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'template-sources-'))
})

afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

describe('readConfiguredTemplates', () => {
	test('loads configured site slots relative to the config file and deduplicates resolved paths', async () => {
		await mkdir(path.join(directory, 'components'))
		const sharedFile = path.join(directory, 'components/shared.svelte')
		const feedFile = path.join(directory, 'feed.svelte')
		await writeFile(sharedFile, '<p>Shared</p>')
		await writeFile(feedFile, '<div>Feed</div>')
		const config = validateConfig({
			pieces: [{ type: 'custom-kind', fields: { title: 'title', date_consumed: 'date' } }],
			content: {
				component: {
					root: './components/shared.svelte',
					feed: feedFile,
					'404': './components/../components/shared.svelte',
					error: './components/shared.svelte',
				},
			},
		})
		config.paths.config = path.relative(process.cwd(), path.join(directory, 'config.yaml'))
		const originalConfig = structuredClone(config)
		const templates = await readConfiguredTemplates(config)

		expect(templates).toHaveLength(4)
		expect(new Set(templates.map((template) => template.slot))).toEqual(
			new Set(['root', 'feed', '404', 'error'])
		)
		expect(new Map(templates.map((template) => [template.filename, template.source]))).toEqual(
			new Map([
				[sharedFile, '<p>Shared</p>'],
				[feedFile, '<div>Feed</div>'],
			])
		)
		expect(new Set(templates.map((template) => template.name)).size).toBe(2)
		const shared = templates.filter((template) => template.filename === sharedFile)
		expect(new Set(shared.map((template) => template.name)).size).toBe(1)
		expect(templates.every((template) => /^template-\d+$/.test(template.name))).toBe(true)
		expect(config).toEqual(originalConfig)
	})

	test('returns no sources when overrides are absent or empty, without requiring a config path', async () => {
		const config = validateConfig({
			pieces: [{ type: 'custom-kind', fields: { title: 'title', date_consumed: 'date' } }],
		})
		expect(config.paths.config).toBeUndefined()
		expect(await readConfiguredTemplates(config)).toEqual([])
		config.content.component = { root: undefined, feed: '' }
		expect(await readConfiguredTemplates(config)).toEqual([])
	})

	test('requires the config location when a source is registered', async () => {
		const config = validateConfig({ content: { component: { root: 'root.svelte' } } })
		await expect(readConfiguredTemplates(config)).rejects.toThrow('config.paths.config is required')
	})

	test('preserves a missing-file error and its resolved filename', async () => {
		const config = validateConfig({ content: { component: { root: 'missing.svelte' } } })
		config.paths.config = path.join(directory, 'config.yaml')
		await expect(readConfiguredTemplates(config)).rejects.toMatchObject({
			code: 'ENOENT',
			path: path.join(directory, 'missing.svelte'),
		})
	})

	test('rereads changed sources rather than keeping a process-wide cache', async () => {
		const filename = path.join(directory, 'root.svelte')
		const config = validateConfig({ content: { component: { root: './root.svelte' } } })
		config.paths.config = path.join(directory, 'config.yaml')
		await writeFile(filename, '<p>Before</p>')
		expect((await readConfiguredTemplates(config))[0].source).toBe('<p>Before</p>')
		await writeFile(filename, '<p>After</p>')
		expect((await readConfiguredTemplates(config))[0].source).toBe('<p>After</p>')
	})
})
