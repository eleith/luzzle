import { describe, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { compileTemplate } from './compile.js'

const exec = promisify(execFile)
const fixture = new URL('../../test/fixtures/templates/page.svelte', import.meta.url)

// A native Node process, not Vitest's module loader. Any dependency left outside
// the artifact must be a Node builtin, even if the workspace could resolve it.
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
const first = render({ data: { piece: { type: 'custom-one', title: '<First>&' } } });
const second = render({ data: { piece: { type: 'another-kind', title: 'Second' } } });
console.log(JSON.stringify({ first, second }));
`

describe('compileTemplate', () => {
	test('produces a standalone renderer with escaped content and scoped CSS', async () => {
		const source = await readFile(fixture, 'utf8')
		const compiled = await compileTemplate(source, fileURLToPath(fixture))
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
			])
			const { first, second } = JSON.parse(stdout)
			expect(Object.keys(first).sort()).toEqual(['body', 'head'])
			expect(first.body).toContain('custom-one: &lt;First>&amp;')
			expect(first.body).toMatch(/class="piece svelte-/)
			expect(first.head).toContain('--color-primary')
			expect(first.head).toContain('<style')
			expect(second.body).toContain('another-kind: Second')
			expect(second.body).not.toContain('First')
		} finally {
			await rm(directory, { recursive: true, force: true })
		}
	})

	test('preserves Svelte source warnings for the caller', async () => {
		const source = '<p>Hello</p><style>.unused { color: var(--color-primary); }</style>'
		const compiled = await compileTemplate(source, 'unused.svelte')
		expect(compiled.warnings).toEqual([
			expect.objectContaining({ code: 'css_unused_selector', filename: 'unused.svelte' }),
		])
	})

	test('reports invalid source with its original filename', async () => {
		await expect(compileTemplate('<div>', 'broken.svelte')).rejects.toMatchObject({
			code: 'element_unclosed',
			filename: 'broken.svelte',
		})
	})
})
