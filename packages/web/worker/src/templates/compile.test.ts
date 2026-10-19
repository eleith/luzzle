import { describe, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { compileTemplates } from './compile.js'

const exec = promisify(execFile)
const pageFixture = new URL('../../test/fixtures/templates/page.svelte', import.meta.url)
const contextFixture = new URL('../../test/fixtures/templates/context.svelte', import.meta.url)
const quotedName = 'quoted"\\\nname'

// Native Node rejects dependencies the workspace might otherwise supply.
const runArtifact = `
import { isBuiltin, registerHooks } from 'node:module';
const moduleUrl = process.argv[1];
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier !== moduleUrl && !isBuiltin(specifier)) {
			throw new Error('Artifact has an external dependency: ' + specifier);
		}
		return nextResolve(specifier, context);
	}
});
const { render } = await import(moduleUrl);
const first = render('page', { data: { piece: { type: 'custom-one', title: '<First>&' } } });
const contexts = [];
const capture = value => contexts.push(value);
const contextA = render('context-a', { data: { label: 'A', capture } });
const contextB = render('context-b', { data: { label: 'B', capture } });
if (contexts.length !== 2 || contexts[0] !== contexts[1]) {
	throw new Error('Templates do not share one Svelte runtime');
}
let contextCleared = false;
try { contexts[0]('fixture-label'); } catch { contextCleared = true; }
if (!contextCleared) throw new Error('Svelte context leaked outside rendering');
const second = render('page', { data: { piece: { type: 'another-kind', title: 'Second' } } });
const props = { data: { piece: { type: 'other', title: 'Named' } } };
const reserved = render('__proto__', props);
const quoted = render(process.argv[2], props);
let unknown;
try { render('toString', props); } catch (error) { unknown = error.message; }
console.log(JSON.stringify({ first, contextA, contextB, second, reserved, quoted, unknown }));
`

describe('compileTemplates', () => {
	test('bundles named templates with one runtime and independent render output', async () => {
		const page = {
			source: await readFile(pageFixture, 'utf8'),
			filename: fileURLToPath(pageFixture),
		}
		const contextSource = await readFile(contextFixture, 'utf8')
		const compiled = await compileTemplates({
			page,
			'context-a': { source: contextSource, filename: 'context-a.svelte' },
			'context-b': { source: contextSource, filename: 'context-b.svelte' },
			['__proto__']: page,
			[quotedName]: page,
		})
		expect(compiled.warnings).toEqual([])

		const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url))
		await mkdir(cache, { recursive: true })
		const directory = await mkdtemp(path.join(cache, 'template-'))
		try {
			const modulePath = path.join(directory, 'renderer.mjs')
			await writeFile(modulePath, compiled.code)
			const { stdout } = await exec(process.execPath, [
				'--input-type=module',
				'-e',
				runArtifact,
				pathToFileURL(modulePath).href,
				quotedName,
			])
			const { first, contextA, contextB, second, reserved, quoted, unknown } = JSON.parse(stdout)
			expect(Object.keys(first).sort()).toEqual(['body', 'head'])
			expect(first.body).toContain('custom-one: &lt;First>&amp;')
			expect(first.body).toMatch(/class="piece svelte-/)
			expect(first.head).toContain('--color-primary')
			expect(first.head).not.toContain('--color-secondary')
			expect(contextA.body).toContain('>A</p>')
			expect(contextB.body).toContain('>B</p>')
			expect(contextA.head).toContain('--color-secondary')
			expect(contextA.head).not.toContain('--color-primary')
			expect(second.body).toContain('another-kind: Second')
			expect(second.body).not.toContain('First')
			expect(second.head).toBe(first.head)
			expect(reserved.body).toContain('other: Named')
			expect(quoted.body).toBe(reserved.body)
			expect(unknown).toBe('Unknown template: toString')
		} finally {
			await rm(directory, { recursive: true, force: true })
		}
	})

	test('collects warnings while preserving each source filename', async () => {
		const source = '<p>Hello</p><style>.unused { color: var(--color-primary); }</style>'
		const compiled = await compileTemplates({
			first: { source, filename: 'first.svelte' },
			second: { source, filename: 'second.svelte' },
		})
		expect(compiled.warnings).toEqual([
			expect.objectContaining({ code: 'css_unused_selector', filename: 'first.svelte' }),
			expect.objectContaining({ code: 'css_unused_selector', filename: 'second.svelte' }),
		])
	})

	test('rejects invalid source without losing the original filename', async () => {
		await expect(
			compileTemplates({
				valid: { source: '<p>Valid</p>', filename: 'valid.svelte' },
				broken: { source: '<div>', filename: 'broken.svelte' },
			})
		).rejects.toMatchObject({ code: 'element_unclosed', filename: 'broken.svelte' })
	})
})
