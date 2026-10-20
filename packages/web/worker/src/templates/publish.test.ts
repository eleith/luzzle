import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import type * as FileSystem from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { validateConfig } from '@luzzle/web.config'
import { publishTemplateBundle } from './publish.js'

vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof FileSystem>()
	return {
		...actual,
		writeFile: vi.fn(actual.writeFile),
		rename: vi.fn(actual.rename),
		rm: vi.fn(actual.rm),
	}
})

const exec = promisify(execFile)
let directory: string
let preparedDirectory: string

beforeEach(async () => {
	vi.clearAllMocks()
	const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'publish-template-bundle-'))
	preparedDirectory = path.join(directory, 'prepared')
})

afterEach(async () => {
	vi.resetAllMocks()
	await rm(directory, { recursive: true, force: true })
})

async function configFor(label: string, color = '#123456') {
	await writeFile(path.join(directory, `${label}.svelte`), `<h1>${label}</h1>`)
	const config = validateConfig({
		content: { component: { root: `./${label}.svelte` } },
		theme: { light: { 'color-primary': color } },
	})
	config.paths.config = path.join(directory, 'config.yaml')
	return config
}

const renderPublishedRevision = `
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const directory = process.argv[1];
const revision = process.argv[2] ?? JSON.parse(await readFile(path.join(directory, 'current.json'), 'utf8')).revision;
const revisionDirectory = path.join(directory, 'revisions', revision);
const { render, templateLookup } = await import(pathToFileURL(path.join(revisionDirectory, 'templates.mjs')).href);
const { body } = render(templateLookup.site.root, {});
const css = await readFile(path.join(revisionDirectory, 'theme.css'), 'utf8');
console.log(JSON.stringify({ revision, body, css }));
`

async function renderSelected(revision?: string) {
	const { stdout } = await exec(process.execPath, [
		'--input-type=module',
		'-e',
		renderPublishedRevision,
		preparedDirectory,
		...(revision ? [revision] : []),
	])
	return JSON.parse(stdout)
}

async function currentText() {
	return readFile(path.join(preparedDirectory, 'current.json'), 'utf8')
}

describe('publishTemplateBundle', () => {
	test('publishes and selects a complete renderer and CSS revision for a native reader', async () => {
		const config = await configFor('first', '#135790')
		const published = await publishTemplateBundle(
			config,
			path.relative(process.cwd(), preparedDirectory)
		)
		expect(JSON.parse(await currentText())).toEqual({ revision: published.revision })
		expect(published.warnings).toEqual([])
		expect((await readdir(preparedDirectory)).sort()).toEqual(['current.json', 'revisions'])
		expect(await readdir(path.join(preparedDirectory, 'revisions'))).toEqual([published.revision])
		expect(
			(await readdir(path.join(preparedDirectory, 'revisions', published.revision))).sort()
		).toEqual(['templates.mjs', 'theme.css'])
		const selected = await renderSelected()
		expect(selected.revision).toBe(published.revision)
		expect(selected.body).toContain('first')
		expect(selected.css).toContain('--color-primary: #135790;')
	})

	test('switches selection while keeping the earlier revision usable by a pinned reader', async () => {
		const first = await publishTemplateBundle(
			await configFor('first', '#135790'),
			preparedDirectory
		)
		const pinned = JSON.parse(await currentText()).revision
		const second = await publishTemplateBundle(
			await configFor('second', '#246801'),
			preparedDirectory
		)
		expect(second.revision).not.toBe(first.revision)
		const current = await renderSelected()
		expect(current.revision).toBe(second.revision)
		expect(current.body).toContain('second')
		expect(current.css).toContain('--color-primary: #246801;')
		const previous = await renderSelected(pinned)
		expect(previous.revision).toBe(first.revision)
		expect(previous.body).toContain('first')
		expect(previous.css).toContain('--color-primary: #135790;')
		expect((await readdir(path.join(preparedDirectory, 'revisions'))).sort()).toEqual(
			[first.revision, second.revision].sort()
		)
	})

	test('returns source warnings without putting them in the selector', async () => {
		const config = await configFor('warning')
		const filename = path.join(directory, 'warning.svelte')
		await writeFile(filename, '<p>Hello</p><style>.unused { color: var(--color-primary); }</style>')
		const published = await publishTemplateBundle(config, preparedDirectory)
		expect(published.warnings).toEqual([expect.objectContaining({ code: 'css_unused_selector' })])
		expect(path.resolve(published.warnings[0].filename ?? '')).toBe(filename)
		expect(JSON.parse(await currentText())).toEqual({ revision: published.revision })
	})

	test('does not create a selection when the first build fails', async () => {
		const config = await configFor('broken')
		await writeFile(path.join(directory, 'broken.svelte'), '<div>')
		await expect(publishTemplateBundle(config, preparedDirectory)).rejects.toMatchObject({
			code: 'element_unclosed',
		})
		await expect(currentText()).rejects.toMatchObject({ code: 'ENOENT' })
	})

	test('keeps the previous selection and files when a later build fails', async () => {
		const previous = await publishTemplateBundle(await configFor('first'), preparedDirectory)
		const before = await currentText()
		const config = await configFor('broken')
		await writeFile(path.join(directory, 'broken.svelte'), '<div>')
		await expect(publishTemplateBundle(config, preparedDirectory)).rejects.toMatchObject({
			code: 'element_unclosed',
		})
		expect(await currentText()).toBe(before)
		expect(await readdir(path.join(preparedDirectory, 'revisions'))).toEqual([previous.revision])
		expect((await renderSelected()).body).toContain('first')
	})

	test('does not select a revision when its CSS write fails', async () => {
		const previous = await publishTemplateBundle(await configFor('first'), preparedDirectory)
		const before = await currentText()
		const config = await configFor('second')
		const failure = new Error('simulated CSS failure')
		const actual = await vi.importActual<typeof FileSystem>('node:fs/promises')
		vi.mocked(writeFile).mockImplementation(async (filename, data, options) => {
			if (path.basename(String(filename)) === 'theme.css') {
				await actual.writeFile(filename, 'partial CSS')
				throw failure
			}
			return actual.writeFile(filename, data, options)
		})
		await expect(publishTemplateBundle(config, preparedDirectory)).rejects.toBe(failure)
		expect(await currentText()).toBe(before)
		expect(await readdir(path.join(preparedDirectory, 'revisions'))).toEqual([previous.revision])
		expect((await renderSelected()).body).toContain('first')
	})

	test('leaves the old selector in place until both new revision files are ready', async () => {
		await publishTemplateBundle(await configFor('first'), preparedDirectory)
		const before = await currentText()
		const config = await configFor('second', '#246801')
		const actual = await vi.importActual<typeof FileSystem>('node:fs/promises')
		let selectorRenames = 0
		vi.mocked(rename).mockImplementation(async (from, to) => {
			if (String(to) === path.join(preparedDirectory, 'current.json')) {
				selectorRenames++
				const { revision } = JSON.parse(await readFile(from, 'utf8'))
				const revisionDirectory = path.join(preparedDirectory, 'revisions', revision)
				expect((await readdir(revisionDirectory)).sort()).toEqual(['templates.mjs', 'theme.css'])
				expect(await readFile(path.join(revisionDirectory, 'templates.mjs'), 'utf8')).toContain(
					'second'
				)
				expect(await readFile(path.join(revisionDirectory, 'theme.css'), 'utf8')).toContain(
					'--color-primary: #246801;'
				)
				expect(await currentText()).toBe(before)
			}
			return actual.rename(from, to)
		})
		await publishTemplateBundle(config, preparedDirectory)
		expect(selectorRenames).toBe(1)
		expect((await renderSelected()).body).toContain('second')
	})

	test('removes a partial temporary selector and preserves the previous selection', async () => {
		await publishTemplateBundle(await configFor('first'), preparedDirectory)
		const before = await currentText()
		const config = await configFor('second')
		const failure = Object.assign(new Error('simulated incomplete selector write'), {
			code: 'ENOSPC',
		})
		const actual = await vi.importActual<typeof FileSystem>('node:fs/promises')
		vi.mocked(writeFile).mockImplementation(async (filename, data, options) => {
			if (path.basename(String(filename)).startsWith('.current-')) {
				await actual.writeFile(filename, '{"revision":')
				throw failure
			}
			return actual.writeFile(filename, data, options)
		})
		await expect(publishTemplateBundle(config, preparedDirectory)).rejects.toBe(failure)
		expect(await currentText()).toBe(before)
		expect((await readdir(preparedDirectory)).sort()).toEqual(['current.json', 'revisions'])
		expect(await readdir(path.join(preparedDirectory, 'revisions'))).toHaveLength(2)
		expect((await renderSelected()).body).toContain('first')
	})

	test('cleans up its completed temporary selector when the selector rename fails with EEXIST', async () => {
		await publishTemplateBundle(await configFor('first'), preparedDirectory)
		const before = await currentText()
		const config = await configFor('second')
		const failure = Object.assign(new Error('simulated selector rename failure'), {
			code: 'EEXIST',
		})
		const actual = await vi.importActual<typeof FileSystem>('node:fs/promises')
		vi.mocked(rename).mockImplementation(async (from, to) => {
			if (String(to) === path.join(preparedDirectory, 'current.json')) throw failure
			return actual.rename(from, to)
		})
		await expect(publishTemplateBundle(config, preparedDirectory)).rejects.toBe(failure)
		expect(await currentText()).toBe(before)
		expect((await readdir(preparedDirectory)).sort()).toEqual(['current.json', 'revisions'])
		expect((await renderSelected()).body).toContain('first')
	})

	test('preserves the selector error and cleanup error if both operations fail', async () => {
		await publishTemplateBundle(await configFor('first'), preparedDirectory)
		const before = await currentText()
		const config = await configFor('second')
		const failure = new Error('simulated selector rename failure')
		const cleanupError = new Error('simulated cleanup failure')
		const actual = await vi.importActual<typeof FileSystem>('node:fs/promises')
		vi.mocked(rename).mockImplementation(async (from, to) => {
			if (String(to) === path.join(preparedDirectory, 'current.json')) throw failure
			return actual.rename(from, to)
		})
		vi.mocked(rm).mockRejectedValueOnce(cleanupError)
		const caught = await publishTemplateBundle(config, preparedDirectory).catch(
			(error: unknown) => error
		)
		expect(caught).toBeInstanceOf(AggregateError)
		expect(caught).toMatchObject({ cause: failure, errors: [failure, cleanupError] })
		expect(await currentText()).toBe(before)
		expect(
			(await readdir(preparedDirectory)).filter((name) => name.startsWith('.current-'))
		).toHaveLength(1)
	})

	test("does not delete another writer's temporary selector on an exclusive-create collision", async () => {
		await publishTemplateBundle(await configFor('first'), preparedDirectory)
		const before = await currentText()
		const config = await configFor('second')
		vi.clearAllMocks()
		const failure = Object.assign(new Error('simulated exclusive-create collision'), {
			code: 'EEXIST',
		})
		const actual = await vi.importActual<typeof FileSystem>('node:fs/promises')
		let otherTemporaryFile = ''
		vi.mocked(writeFile).mockImplementation(async (filename, data, options) => {
			if (path.basename(String(filename)).startsWith('.current-')) {
				otherTemporaryFile = String(filename)
				await actual.writeFile(filename, 'another writer owns this')
				throw failure
			}
			return actual.writeFile(filename, data, options)
		})
		await expect(publishTemplateBundle(config, preparedDirectory)).rejects.toBe(failure)
		expect(rm).not.toHaveBeenCalled()
		expect(await readFile(otherTemporaryFile, 'utf8')).toBe('another writer owns this')
		expect(await currentText()).toBe(before)
	})

	test('selects by successful rename order when concurrent publications finish in reverse order', async () => {
		const firstConfig = await configFor('first', '#135790')
		const secondConfig = await configFor('second', '#246801')
		const actual = await vi.importActual<typeof FileSystem>('node:fs/promises')
		let releaseFirst!: () => void
		const firstCanSelect = new Promise<void>((resolve) => {
			releaseFirst = resolve
		})
		let markFirstReady!: () => void
		const firstReady = new Promise<void>((resolve) => {
			markFirstReady = resolve
		})
		vi.mocked(rename).mockImplementation(async (from, to) => {
			if (String(to) === path.join(preparedDirectory, 'current.json')) {
				const { revision } = JSON.parse(await readFile(from, 'utf8'))
				const css = await readFile(
					path.join(preparedDirectory, 'revisions', revision, 'theme.css'),
					'utf8'
				)
				if (css.includes('--color-primary: #135790;')) {
					markFirstReady()
					await firstCanSelect
				}
			}
			return actual.rename(from, to)
		})
		const firstPublication = publishTemplateBundle(firstConfig, preparedDirectory)
		try {
			await firstReady
			const second = await publishTemplateBundle(secondConfig, preparedDirectory)
			const selectedSecond = await renderSelected()
			expect(selectedSecond.revision).toBe(second.revision)
			expect(selectedSecond.body).toContain('second')
			expect(selectedSecond.css).toContain('--color-primary: #246801;')

			releaseFirst()
			const first = await firstPublication
			const selectedFirst = await renderSelected()
			expect(selectedFirst.revision).toBe(first.revision)
			expect(selectedFirst.body).toContain('first')
			expect(selectedFirst.css).toContain('--color-primary: #135790;')
			expect((await readdir(path.join(preparedDirectory, 'revisions'))).sort()).toEqual(
				[first.revision, second.revision].sort()
			)
			expect((await readdir(preparedDirectory)).sort()).toEqual(['current.json', 'revisions'])
		} finally {
			releaseFirst()
			await firstPublication
		}
	})
})
