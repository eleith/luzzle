import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import type * as FileSystem from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { validateConfig } from '@luzzle/web.config'
import { buildTemplateBundle, type TemplateBundle } from './bundle.js'
import { writeTemplateBundle } from './write.js'

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
let emptyBundle: TemplateBundle

beforeAll(async () => {
	emptyBundle = await buildTemplateBundle(validateConfig({}))
})

beforeEach(async () => {
	vi.clearAllMocks()
	const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'write-template-bundle-'))
})

afterEach(async () => {
	vi.resetAllMocks()
	await rm(directory, { recursive: true, force: true })
})

const renderWrittenBundle = `
const { render, templateLookup } = await import(process.argv[1]);
const types = Object.keys(templateLookup.pieces);
const pieces = types.map(type => render(templateLookup.pieces[type].page, { data: { piece: { title: type } } }).body);
const root = render(templateLookup.site.root, {});
console.log(JSON.stringify({ templateLookup, types, pieces, root }));
`

async function renderFile(filename: string) {
	const { stdout } = await exec(process.execPath, [
		'--input-type=module',
		'-e',
		renderWrittenBundle,
		pathToFileURL(filename).href,
	])
	return JSON.parse(stdout)
}

describe('writeTemplateBundle', () => {
	test('writes one importable module containing the render function and exact template lookup', async () => {
		await writeFile(path.join(directory, 'package.json'), JSON.stringify({ type: 'commonjs' }))
		await writeFile(
			path.join(directory, 'piece.svelte'),
			'<script>let { data } = $props()</script><p>{data.piece.title}</p>'
		)
		await writeFile(path.join(directory, 'site.svelte'), '<h1>Written site</h1>')
		const types = ['custom-kind', '__proto__', 'quoted"\\\nkind']
		const config = validateConfig({
			pieces: types.map((type) => ({
				type,
				fields: { title: 'title', date_consumed: 'date' },
				components: { page: './piece.svelte' },
			})),
			content: { component: { root: './site.svelte' } },
		})
		config.paths.config = path.join(directory, 'config.yaml')
		const bundle = await buildTemplateBundle(config)
		const outputDirectory = path.join(directory, 'prepared', 'new-bundle')
		const filename = await writeTemplateBundle(
			bundle,
			path.relative(process.cwd(), outputDirectory)
		)

		expect(filename).toBe(path.join(outputDirectory, 'templates.mjs'))
		expect(await readdir(outputDirectory)).toEqual(['templates.mjs'])
		expect(await readdir(path.dirname(outputDirectory))).toEqual(['new-bundle'])
		const rendered = await renderFile(filename)
		expect(rendered.templateLookup).toEqual(bundle.templateLookup)
		expect(rendered.types).toEqual(types)
		expect(rendered.pieces).toHaveLength(3)
		expect(rendered.pieces[0]).toContain('custom-kind')
		expect(rendered.pieces[1]).toContain('__proto__')
		expect(rendered.root.body).toContain('Written site')
	})

	test('keeps the lookup export distinct from template-local variables', async () => {
		await writeFile(
			path.join(directory, 'root.svelte'),
			`<script module>let templateLookup = 'Template-local-' + String(Date.now())</script><p>{templateLookup}</p>`
		)
		const config = validateConfig({ content: { component: { root: './root.svelte' } } })
		config.paths.config = path.join(directory, 'config.yaml')
		const bundle = await buildTemplateBundle(config)
		const filename = await writeTemplateBundle(bundle, path.join(directory, 'output'))
		const rendered = await renderFile(filename)
		expect(rendered.templateLookup).toEqual(bundle.templateLookup)
		expect(rendered.root.body).toContain('Template-local-')
	})

	test('does not overwrite an existing nonempty bundle directory', async () => {
		const outputDirectory = path.join(directory, 'existing')
		const filename = await writeTemplateBundle(emptyBundle, outputDirectory)
		const changedBundle = { ...emptyBundle, moduleCode: `${emptyBundle.moduleCode}\n// Changed` }
		await expect(writeTemplateBundle(changedBundle, outputDirectory)).rejects.toThrow()
		expect(await readFile(filename, 'utf8')).toBe(emptyBundle.moduleCode)
		expect(await readdir(directory)).toEqual(['existing'])
	})

	test('removes a partial staged write without changing an earlier bundle', async () => {
		const priorFilename = await writeTemplateBundle(emptyBundle, path.join(directory, 'previous'))
		const failure = new Error('simulated incomplete write')
		const actual = await vi.importActual<typeof FileSystem>('node:fs/promises')
		vi.mocked(writeFile).mockImplementationOnce(async (filename) => {
			await actual.writeFile(filename, 'partial')
			throw failure
		})
		await expect(writeTemplateBundle(emptyBundle, path.join(directory, 'next'))).rejects.toBe(
			failure
		)
		expect(await readFile(priorFilename, 'utf8')).toBe(emptyBundle.moduleCode)
		expect(await readdir(directory)).toEqual(['previous'])
	})

	test('removes completed staging files after a failed rename, preserving an earlier bundle', async () => {
		const priorFilename = await writeTemplateBundle(emptyBundle, path.join(directory, 'previous'))
		const failure = new Error('simulated rename failure')
		vi.mocked(rename).mockImplementationOnce(async (from) => {
			expect(await readFile(path.join(String(from), 'templates.mjs'), 'utf8')).toBe(
				emptyBundle.moduleCode
			)
			throw failure
		})
		await expect(writeTemplateBundle(emptyBundle, path.join(directory, 'next'))).rejects.toBe(
			failure
		)
		expect(await readFile(priorFilename, 'utf8')).toBe(emptyBundle.moduleCode)
		expect(await readdir(directory)).toEqual(['previous'])
	})

	test('preserves the primary error and cleanup error when both operations fail', async () => {
		const writeError = new Error('simulated write failure')
		const cleanupError = new Error('simulated cleanup failure')
		vi.mocked(writeFile).mockRejectedValueOnce(writeError)
		vi.mocked(rm).mockRejectedValueOnce(cleanupError)
		const failure = await writeTemplateBundle(emptyBundle, path.join(directory, 'output')).catch(
			(error: unknown) => error
		)
		expect(failure).toBeInstanceOf(AggregateError)
		expect(failure).toMatchObject({ cause: writeError, errors: [writeError, cleanupError] })
		expect(await readdir(directory)).toEqual([expect.stringMatching(/^\.template-bundle-/)])
	})

	test('propagates parent-directory errors without creating staging files', async () => {
		const blocker = path.join(directory, 'blocker')
		await writeFile(blocker, 'not a directory')
		await expect(
			writeTemplateBundle(emptyBundle, path.join(blocker, 'output'))
		).rejects.toMatchObject({ syscall: 'mkdir' })
		expect(await readdir(directory)).toEqual(['blocker'])
	})

	test('allows only one concurrent writer to complete at the same destination', async () => {
		const outputDirectory = path.join(directory, 'output')
		const otherBundle = { ...emptyBundle, moduleCode: `${emptyBundle.moduleCode}\n// Other writer` }
		const results = await Promise.allSettled([
			writeTemplateBundle(emptyBundle, outputDirectory),
			writeTemplateBundle(otherBundle, outputDirectory),
		])
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
		expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
		const moduleCode = await readFile(path.join(outputDirectory, 'templates.mjs'), 'utf8')
		expect([emptyBundle.moduleCode, otherBundle.moduleCode]).toContain(moduleCode)
		expect(await readdir(directory)).toEqual(['output'])
	})
})
