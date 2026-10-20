import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { validateConfig } from '@luzzle/web.config'
import { buildTemplateBundle } from './bundle.js'

const exec = promisify(execFile)
let directory: string

beforeEach(async () => {
	const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'template-bundle-'))
})

afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

const renderBundle = `
const { render } = await import(process.argv[1]);
const templateLookup = JSON.parse(process.argv[2]);
const piece = render(templateLookup.pieces['custom-kind'].page, { data: { piece: { title: '<Piece>&' } } });
const root = render(templateLookup.site.root, { data: { pieces: [{ title: 'Site' }] } });
const reserved = render(templateLookup.pieces['__proto__'].icon, { data: { piece: { title: 'Reserved' } } });
console.log(JSON.stringify({ piece, root, reserved }));
`

describe('buildTemplateBundle', () => {
	test('builds configured templates with a lookup that selects the right rendered output', async () => {
		await writeFile(
			path.join(directory, 'piece.svelte'),
			`
			<script>let { data } = $props()</script>
			<p class="piece">{data.piece.title}</p>
			<style>.piece { color: var(--color-primary); }</style>
		`
		)
		await writeFile(
			path.join(directory, 'site.svelte'),
			`
			<script>let { data } = $props()</script>
			<h1 class="site">{data.pieces[0].title}</h1>
			<style>.site { color: var(--color-secondary); }</style>
		`
		)
		const config = validateConfig({
			pieces: ['custom-kind', '__proto__'].map((type) => ({
				type,
				fields: { title: 'title', date_consumed: 'date' },
				components: { page: './piece.svelte', icon: './piece.svelte', opengraph: './piece.svelte' },
			})),
			content: {
				component: {
					root: './site.svelte',
					feed: './site.svelte',
					'404': './site.svelte',
					error: './site.svelte',
				},
			},
		})
		config.paths.config = path.join(directory, 'config.yaml')
		const bundle = await buildTemplateBundle(config)
		const { templateLookup } = bundle
		expect(bundle.warnings).toEqual([])
		expect(Object.keys(templateLookup.pieces)).toEqual(['custom-kind', '__proto__'])
		for (const roles of Object.values(templateLookup.pieces)) {
			expect(Object.keys(roles)).toEqual(['page', 'icon', 'opengraph'])
			expect(roles.icon).toBe(roles.page)
			expect(roles.opengraph).toBe(roles.page)
		}
		expect(templateLookup.pieces['__proto__'].page).toBe(templateLookup.pieces['custom-kind'].page)
		expect(new Set(Object.values(templateLookup.site))).toEqual(new Set([templateLookup.site.root]))
		expect(new Set(Object.keys(templateLookup.site))).toEqual(
			new Set(['root', 'feed', '404', 'error'])
		)
		expect(templateLookup.site.root).not.toBe(templateLookup.pieces['custom-kind'].page)
		expect(JSON.stringify(templateLookup)).not.toContain(directory)
		expect(JSON.stringify(templateLookup)).not.toContain('.svelte')

		const modulePath = path.join(directory, 'renderer.mjs')
		await writeFile(modulePath, bundle.moduleCode)
		const { stdout } = await exec(process.execPath, [
			'--input-type=module',
			'-e',
			renderBundle,
			pathToFileURL(modulePath).href,
			JSON.stringify(templateLookup),
		])
		const { piece, root, reserved } = JSON.parse(stdout)
		expect(piece.body).toContain('&lt;Piece>&amp;')
		expect(piece.head).toContain('--color-primary')
		expect(piece.head).not.toContain('--color-secondary')
		expect(root.body).toContain('Site')
		expect(root.head).toContain('--color-secondary')
		expect(reserved.body).toContain('Reserved')
	})

	test('builds an empty lookup when no overrides are configured', async () => {
		const bundle = await buildTemplateBundle(validateConfig({}))
		expect(bundle.templateLookup).toEqual({ pieces: {}, site: {} })
		expect(bundle.warnings).toEqual([])
	})

	test('retains source warnings without placing source paths in the lookup', async () => {
		const filename = path.join(directory, 'warning.svelte')
		await writeFile(filename, '<p>Hello</p><style>.unused { color: var(--color-primary); }</style>')
		const config = validateConfig({ content: { component: { root: './warning.svelte' } } })
		config.paths.config = path.join(directory, 'config.yaml')
		const bundle = await buildTemplateBundle(config)
		expect(bundle.warnings).toEqual([expect.objectContaining({ code: 'css_unused_selector' })])
		expect(path.resolve(bundle.warnings[0].filename ?? '')).toBe(filename)
		expect(bundle.templateLookup.site.root).toMatch(/^template-\d+$/)
	})

	test('propagates invalid-source errors with their filename instead of returning a partial bundle', async () => {
		const filename = path.join(directory, 'broken.svelte')
		await writeFile(filename, '<div>')
		const config = validateConfig({ content: { component: { root: './broken.svelte' } } })
		config.paths.config = path.join(directory, 'config.yaml')
		await expect(buildTemplateBundle(config)).rejects.toMatchObject({
			code: 'element_unclosed',
			filename,
		})
	})

	test('rejects conflicting registrations for the same piece type and role', async () => {
		await writeFile(path.join(directory, 'first.svelte'), '<p>First</p>')
		await writeFile(path.join(directory, 'second.svelte'), '<p>Second</p>')
		const config = validateConfig({
			pieces: ['first', 'second'].map((file) => ({
				type: 'same-kind',
				fields: { title: 'title', date_consumed: 'date' },
				components: { page: `./${file}.svelte` },
			})),
		})
		config.paths.config = path.join(directory, 'config.yaml')
		await expect(buildTemplateBundle(config)).rejects.toThrow(
			'Conflicting page templates for piece type "same-kind"'
		)
	})

	test('coalesces identical repeated registrations for the same role', async () => {
		await writeFile(path.join(directory, 'shared.svelte'), '<p>Shared</p>')
		const config = validateConfig({
			pieces: [1, 2].map(() => ({
				type: 'same-kind',
				fields: { title: 'title', date_consumed: 'date' },
				components: { page: './shared.svelte' },
			})),
		})
		config.paths.config = path.join(directory, 'config.yaml')
		const bundle = await buildTemplateBundle(config)
		expect(Object.keys(bundle.templateLookup.pieces)).toEqual(['same-kind'])
		expect(Object.keys(bundle.templateLookup.pieces['same-kind'])).toEqual(['page'])
	})
})
