import { afterAll, beforeAll, expect, test } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadMarkdownFile } from './files.server.js'

let directory: string
beforeAll(async () => {
	const cache = path.resolve('node_modules/.cache')
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'markdown-files-'))
})
afterAll(async () => {
	if (directory) await rm(directory, { recursive: true, force: true })
})

test('loads rendered HTML once without writing into application source', async () => {
	const file = path.join(directory, 'home.md')
	await writeFile(file, '# First')
	const first = loadMarkdownFile(file)
	expect(loadMarkdownFile(file)).toBe(first)
	expect(await first).toBe('<h1>First</h1>')
	await writeFile(file, '# Changed')
	expect(loadMarkdownFile(file)).toBe(first)
	expect(await loadMarkdownFile(file)).toBe('<h1>First</h1>')
	expect(await readFile(file, 'utf8')).toBe('# Changed')
})

test('an empty configured file is an explicit empty result', async () => {
	const file = path.join(directory, 'empty.md')
	await writeFile(file, '')
	expect(await loadMarkdownFile(file)).toBe('')
})

test('missing explicit files fail with an actionable server-side path', async () => {
	const file = path.join(directory, 'missing.md')
	await expect(loadMarkdownFile(file)).rejects.toThrow(`Unable to load Markdown file "${file}"`)
})

test('the general loader never guesses a working-directory base', () => {
	expect(() => loadMarkdownFile('relative.md')).toThrow('must be absolute')
})
