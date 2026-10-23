import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { validateConfig } from '@luzzle/web.config'
import { generateThemeCss } from '@luzzle/web.theme'
import * as editorTheme from '@luzzle/web.theme/editor'
import { buildTemplateBundle } from './bundle.js'

const exec = promisify(execFile)
let directory: string

beforeEach(async () => {
	const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'template-bundle-'))
})

afterEach(async () => {
	vi.restoreAllMocks()
	await rm(directory, { recursive: true, force: true })
})

const renderBundle = `
const { render, templateLookup } = await import(process.argv[1]);
const feed = render(templateLookup.site.feed, { data: { pieces: [{ title: '<Feed>&' }] } });
const root = render(templateLookup.site.root, { data: { pieces: [{ title: 'Site' }] } });
console.log(JSON.stringify({ feed, root, templateLookup }));
`

describe('buildTemplateBundle', () => {
	test('builds configured site templates with a lookup that selects the right rendered output', async () => {
		await writeFile(
			path.join(directory, 'feed.svelte'),
			`
			<script>let { data } = $props()</script>
			<p class="feed">{data.pieces[0].title}</p>
			<style>.feed { color: var(--color-primary); }</style>
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
			})),
			content: {
				component: {
					root: './site.svelte',
					feed: './feed.svelte',
					'404': './site.svelte',
					error: './site.svelte',
				},
			},
		})
		config.paths.config = path.join(directory, 'config.yaml')
		const bundle = await buildTemplateBundle(config)
		const { templateLookup } = bundle
		expect(bundle.warnings).toEqual([])
		expect(Object.keys(templateLookup)).toEqual(['site'])
		expect(templateLookup.site['404']).toBe(templateLookup.site.root)
		expect(templateLookup.site.error).toBe(templateLookup.site.root)
		expect(new Set(Object.keys(templateLookup.site))).toEqual(
			new Set(['root', 'feed', '404', 'error'])
		)
		expect(templateLookup.site.root).not.toBe(templateLookup.site.feed)
		expect(JSON.stringify(templateLookup)).not.toContain(directory)
		expect(JSON.stringify(templateLookup)).not.toContain('.svelte')

		const modulePath = path.join(directory, 'renderer.mjs')
		await writeFile(modulePath, bundle.moduleCode)
		const { stdout } = await exec(process.execPath, [
			'--input-type=module',
			'-e',
			renderBundle,
			pathToFileURL(modulePath).href,
		])
		const { feed, root, templateLookup: moduleLookup } = JSON.parse(stdout)
		expect(moduleLookup).toEqual(templateLookup)
		expect(feed.body).toContain('&lt;Feed>&amp;')
		expect(feed.head).toContain('--color-primary')
		expect(feed.head).not.toContain('--color-secondary')
		expect(root.body).toContain('Site')
		expect(root.head).toContain('--color-secondary')
	})

	test('builds default theme CSS with an empty lookup when no overrides are configured', async () => {
		const config = validateConfig({})
		const bundle = await buildTemplateBundle(config)
		expect(bundle.templateLookup).toEqual({ site: {} })
		expect(bundle.warnings).toEqual([])
		expect(bundle.themeCss).toBe(
			generateThemeCss(config) +
				(await editorTheme.generateEditorThemeCss(config.theme.markdown.code))
		)
		expect(bundle.themeCss).toContain('--editor-background:')
	})

	test('builds configured site and editor CSS using the existing theme generators', async () => {
		const config = validateConfig({
			theme: {
				light: { 'color-primary': '#123456' },
				dark: { 'color-primary': '#abcdef' },
				markdown: { code: { light: 'vitesse-light', dark: 'vitesse-dark' } },
			},
		})
		const originalConfig = structuredClone(config)
		const bundle = await buildTemplateBundle(config)
		expect(bundle.themeCss).toBe(
			generateThemeCss(config) +
				(await editorTheme.generateEditorThemeCss(config.theme.markdown.code))
		)
		expect(bundle.themeCss).toContain('--color-primary: #123456;')
		expect(bundle.themeCss).toContain('--color-primary: #abcdef;')
		expect(bundle.themeCss).toContain("section[data-theme='light']")
		expect(bundle.themeCss).toContain("section[data-theme='dark']")
		expect(bundle.themeCss).toContain('--editor-foreground:')
		expect(config).toEqual(originalConfig)
	})

	test('propagates theme-generation failures instead of returning a partial bundle', async () => {
		const failure = new Error('simulated editor theme failure')
		vi.spyOn(editorTheme, 'generateEditorThemeCss').mockRejectedValueOnce(failure)
		await expect(buildTemplateBundle(validateConfig({}))).rejects.toBe(failure)
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
})
