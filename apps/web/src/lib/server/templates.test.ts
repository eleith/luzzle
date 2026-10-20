import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import type * as FileSystem from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadTemplateBundle } from './templates.js'

vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof FileSystem>()
	return { ...actual, readFile: vi.fn(actual.readFile) }
})

let directory: string

beforeEach(async () => {
	vi.clearAllMocks()
	const cache = path.resolve('node_modules/.cache')
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'load-template-bundle-'))
})

afterEach(async () => {
	vi.resetAllMocks()
	await rm(directory, { recursive: true, force: true })
})

async function writeRevision(revision: string, body = revision, moduleCode?: string) {
	const target = path.join(directory, 'revisions', revision)
	await mkdir(target, { recursive: true })
	await writeFile(path.join(target, 'theme.css'), `/* ${revision} */`)
	await writeFile(
		path.join(target, 'templates.mjs'),
		moduleCode ??
			`
export const templateLookup = { pieces: { 'custom-kind': { page: 'page' } }, site: { root: 'root' } };
export function render(name, props) { return { body: ${JSON.stringify(body)}, head: '' }; }
`
	)
}

async function select(revision: unknown) {
	await writeFile(path.join(directory, 'current.json'), JSON.stringify({ revision }))
}

describe('loadTemplateBundle', () => {
	test('returns no bundle when preparation has not selected a revision', async () => {
		expect(await loadTemplateBundle(directory)).toBeNull()
	})

	test('loads the selected module and CSS without wrapping its renderer', async () => {
		await writeRevision('first')
		await select('first')
		const loaded = await loadTemplateBundle(path.relative(process.cwd(), directory))
		expect(loaded?.revision).toBe('first')
		expect(loaded?.themeCss).toBe('/* first */')
		expect(loaded?.templateLookup.pieces['custom-kind'].page).toBe('page')
		expect(loaded?.render('page', {})).toEqual({ body: 'first', head: '' })
		const module = await import(
			pathToFileURL(path.join(directory, 'revisions/first/templates.mjs')).href
		)
		expect(loaded?.render).toBe(module.render)
	})

	test('loads new revisions while a captured earlier renderer and CSS remain usable', async () => {
		await writeRevision('first')
		await select('first')
		const first = await loadTemplateBundle(directory)
		await writeRevision('second')
		await select('second')
		const second = await loadTemplateBundle(directory)
		expect(first?.render('page', {}).body).toBe('first')
		expect(first?.themeCss).toBe('/* first */')
		expect(second?.render('page', {}).body).toBe('second')
		expect(second?.themeCss).toBe('/* second */')
	})

	test('reads the selector once and keeps its module and CSS together across a selection change', async () => {
		await writeRevision('first')
		await writeRevision('second')
		await select('first')
		const actual = await vi.importActual<typeof FileSystem>('node:fs/promises')
		let selectorReads = 0
		vi.mocked(readFile).mockImplementation(async (filename, options) => {
			const result = await actual.readFile(filename, options)
			if (String(filename) === path.join(directory, 'current.json')) {
				selectorReads++
				await select('second')
			}
			return result
		})
		const loaded = await loadTemplateBundle(directory)
		expect(selectorReads).toBe(1)
		expect(loaded?.revision).toBe('first')
		expect(loaded?.render('page', {}).body).toBe('first')
		expect(loaded?.themeCss).toBe('/* first */')
	})

	test('propagates genuine selector read errors instead of treating them as missing output', async () => {
		const failure = Object.assign(new Error('simulated read failure'), { code: 'EIO' })
		vi.mocked(readFile).mockRejectedValueOnce(failure)
		await expect(loadTemplateBundle(directory)).rejects.toBe(failure)
	})

	test('propagates malformed selector JSON', async () => {
		await writeFile(path.join(directory, 'current.json'), '{')
		await expect(loadTemplateBundle(directory)).rejects.toBeInstanceOf(SyntaxError)
	})

	test.each(['', '.', '..', '../outside', 'a/b', 'a\\b', null, 5, {}])(
		'rejects an invalid revision identifier: %j',
		async (revision) => {
			await select(revision)
			await expect(loadTemplateBundle(directory)).rejects.toThrow(
				'Invalid prepared template revision'
			)
		}
	)

	test('rejects a selector without a revision', async () => {
		await writeFile(path.join(directory, 'current.json'), '{}')
		await expect(loadTemplateBundle(directory)).rejects.toThrow(
			'Invalid prepared template revision'
		)
	})

	test('propagates a missing selected stylesheet rather than returning an incomplete bundle', async () => {
		await writeRevision('first')
		await select('first')
		await rm(path.join(directory, 'revisions/first/theme.css'))
		await expect(loadTemplateBundle(directory)).rejects.toMatchObject({ code: 'ENOENT' })
	})

	test('propagates a missing selected module', async () => {
		await writeRevision('first')
		await select('first')
		await rm(path.join(directory, 'revisions/first/templates.mjs'))
		await expect(loadTemplateBundle(directory)).rejects.toThrow()
	})

	test.each([
		['missing renderer', 'export const templateLookup = { pieces: {}, site: {} };'],
		['missing lookup', 'export function render() { return {body:"",head:""}; }'],
		[
			'nonfunction renderer',
			'export const render = 1; export const templateLookup = {pieces:{},site:{}};'
		],
		['array lookup', 'export function render() {} export const templateLookup = [];'],
		['missing piece map', 'export function render() {} export const templateLookup = {site:{}};'],
		[
			'invalid piece roles',
			'export function render() {} export const templateLookup = {pieces:{kind:[]},site:{}};'
		],
		[
			'invalid template name',
			'export function render() {} export const templateLookup = {pieces:{kind:{page:5}},site:{}};'
		],
		[
			'invalid site map',
			'export function render() {} export const templateLookup = {pieces:{},site:null};'
		]
	])('reports invalid artifact exports: %s', async (_label, code) => {
		await writeRevision('broken', '', code)
		await select('broken')
		await expect(loadTemplateBundle(directory)).rejects.toThrow('Invalid prepared template exports')
	})

	test('supports normal asynchronous module initialization', async () => {
		await writeRevision(
			'async',
			'',
			'const text = await Promise.resolve("initialized"); export const templateLookup = {pieces:{},site:{root:"root"}}; export function render() { return {body:text,head:""}; }'
		)
		await select('async')
		expect((await loadTemplateBundle(directory))?.render('root', {}).body).toBe('initialized')
	})

	test('lets module initialization errors reach the caller', async () => {
		await writeRevision('broken', '', 'throw new Error("module initialization failed");')
		await select('broken')
		await expect(loadTemplateBundle(directory)).rejects.toThrow('module initialization failed')
	})

	test('lets real rendering errors reach the caller', async () => {
		await writeRevision(
			'broken',
			'',
			'export const templateLookup = {pieces:{},site:{root:"root"}}; export function render() { throw new Error("render failed"); }'
		)
		await select('broken')
		const loaded = await loadTemplateBundle(directory)
		expect(() => loaded?.render('root', {})).toThrow('render failed')
	})
})
