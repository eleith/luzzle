import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { execFile } from 'node:child_process'
import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	readlink,
	rename,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

// Native CLI startup and compilation can exceed Vitest's default under concurrent verification.
vi.setConfig({ testTimeout: 30000 })

const exec = promisify(execFile)
const workerRoot = fileURLToPath(new URL('../../', import.meta.url))
let directory: string
let fixture: string
let command: string

beforeAll(async () => {
	const cache = path.join(workerRoot, 'node_modules/.cache')
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'publication-command-'))
	const output = path.join(directory, 'worker')
	// Always build the actual production entrypoint. CI runs tests before the normal worker build.
	await exec(
		process.execPath,
		[
			path.join(workerRoot, 'node_modules/typescript/bin/tsc'),
			'-p',
			'tsconfig.build.json',
			'--outDir',
			output,
		],
		{ cwd: workerRoot, timeout: 30000 }
	)
	command = path.join(output, 'src/commands/publish-templates.js')
}, 30000)

beforeEach(async () => {
	fixture = await mkdtemp(path.join(directory, 'config-'))
})

afterAll(async () => {
	if (directory) await rm(directory, { recursive: true, force: true })
})

function run(args: string[] = [], cwd = fixture) {
	return exec(process.execPath, [command, ...args], { cwd, timeout: 30000 })
}

async function configure(paths: object = {}) {
	await writeFile(
		path.join(fixture, 'site.svelte'),
		'<script>let { data } = $props()</script><h1>{data.pieces[0].title}</h1>'
	)
	const filename = path.join(fixture, 'config.yaml')
	await writeFile(
		filename,
		JSON.stringify({
			paths,
			content: { component: { root: './site.svelte' } },
			pieces: [
				{
					type: 'arbitrary-kind',
					fields: { title: 'title', date_consumed: 'date' },
				},
			],
		})
	)
	return filename
}

async function selected(prepared: string) {
	return JSON.parse(await readFile(path.join(prepared, 'current.json'), 'utf8')) as {
		revision: string
	}
}

test('help does not read a missing config or create artifacts', async () => {
	const { stdout, stderr } = await run(['--help', '--config', 'missing.yaml'])
	expect(stdout).toContain('Usage: publish-templates')
	expect(stdout).toContain('paths.prepared')
	expect(stderr).toBe('')
	expect(await readdir(fixture)).toEqual([])
})

test('publishes with default paths and renders a real standalone artifact', async () => {
	await configure()
	const { stdout, stderr } = await run()
	const result = JSON.parse(stdout)
	const prepared = path.join(fixture, 'data/prepared')
	expect(result.directory).toBe(prepared)
	expect(result.warnings).toEqual([])
	expect(stderr).toBe('')
	expect(await selected(prepared)).toEqual({ revision: result.revision })
	const revisionDirectory = path.join(prepared, 'revisions', result.revision)
	expect(await readFile(path.join(revisionDirectory, 'theme.css'), 'utf8')).toContain(
		'--color-primary:'
	)
	const { stdout: rendered } = await exec(process.execPath, [
		'--input-type=module',
		'-e',
		`
const bundle = await import(process.argv[1]);
console.log(JSON.stringify(bundle.render(bundle.templateLookup.site.root, {data:{pieces:[{title:'<Published>&'}]}})));
`,
		pathToFileURL(path.join(revisionDirectory, 'templates.mjs')).href,
	])
	expect(JSON.parse(rendered).body).toContain('<h1>&lt;Published>&amp;</h1>')
})

test('fresh CLI processes follow an atomically replaced config through the compatibility link', async () => {
	const filename = await configure()
	const target = path.join(fixture, 'config/config.yaml')
	await mkdir(path.join(fixture, 'config'))
	await rename(filename, target)
	await symlink('config/config.yaml', filename)

	async function renderArtifact(prepared: string, revision: string) {
		const { stdout } = await exec(process.execPath, [
			'--input-type=module',
			'-e',
			`
const { render, templateLookup } = await import(process.argv[1]);
const props = {data:{pieces:[{title:'<Linked>&'}]}};
console.log(JSON.stringify({
	templateLookup,
	root: templateLookup.site.root ? render(templateLookup.site.root, props) : null,
	feed: templateLookup.site.feed ? render(templateLookup.site.feed, props) : null,
}));
`,
			pathToFileURL(path.join(prepared, 'revisions', revision, 'templates.mjs')).href,
		])
		return JSON.parse(stdout)
	}

	// These are fresh production CLI processes, not a running web cache or a container mount test.
	const first = JSON.parse((await run()).stdout)
	const prepared = path.join(fixture, 'data/prepared')
	expect(first.directory).toBe(prepared)
	expect(await selected(prepared)).toEqual({ revision: first.revision })
	const original = await renderArtifact(prepared, first.revision)
	expect(Object.keys(original.templateLookup)).toEqual(['site'])
	expect(Object.keys(original.templateLookup.site)).toEqual(['root'])
	expect(original.root.body).toContain('<h1>&lt;Linked>&amp;</h1>')

	const temporary = path.join(fixture, 'config/config.next.yaml')
	await writeFile(
		temporary,
		JSON.stringify({
			paths: { prepared: './output/prepared' },
			pieces: [
				{
					type: 'replacement-kind',
					fields: { title: 'title', date_consumed: 'date' },
				},
			],
			content: { component: { feed: './site.svelte' } },
		})
	)
	await rename(temporary, target)
	expect(await readlink(filename)).toBe('config/config.yaml')
	const second = JSON.parse((await run()).stdout)
	expect(second.directory).toBe(path.join(fixture, 'output/prepared'))
	expect(second.revision).not.toBe(first.revision)
	expect(await selected(second.directory)).toEqual({ revision: second.revision })
	const replacement = await renderArtifact(second.directory, second.revision)
	expect(Object.keys(replacement.templateLookup)).toEqual(['site'])
	expect(Object.keys(replacement.templateLookup.site)).toEqual(['feed'])
	expect(replacement.root).toBeNull()
	expect(replacement.feed.body).toContain('<h1>&lt;Linked>&amp;</h1>')
	// Changing the relative output leaves the old selected revision and artifact intact.
	expect(await selected(prepared)).toEqual({ revision: first.revision })
	expect(await renderArtifact(prepared, first.revision)).toEqual(original)
	expect(await readdir(path.join(fixture, 'config'))).toEqual(['config.yaml'])
}, 30000)

test('resolves configured relative output and sources beside the config, not the command cwd', async () => {
	const filename = await configure({ prepared: './output/prepared' })
	const elsewhere = path.join(fixture, 'elsewhere')
	await mkdir(elsewhere)
	const { stdout } = await run(['--config', '../config.yaml'], elsewhere)
	const result = JSON.parse(stdout)
	expect(result.directory).toBe(path.join(path.dirname(filename), 'output/prepared'))
	expect(await selected(result.directory)).toEqual({ revision: result.revision })
	expect(await readdir(elsewhere)).toEqual([])
})

test('preserves an absolute output setting and accepts an absolute config filename', async () => {
	const prepared = path.join(fixture, 'absolute-prepared')
	const filename = await configure({ prepared })
	const { stdout } = await run(['-c', filename], directory)
	expect(JSON.parse(stdout).directory).toBe(prepared)
	expect(await selected(prepared)).toEqual({ revision: JSON.parse(stdout).revision })
})

test('returns compiler warnings and their real source filename without failing publication', async () => {
	await configure({ prepared: './prepared' })
	const filename = path.join(fixture, 'site.svelte')
	await writeFile(filename, '<p>Warning</p><style>.unused { color: var(--color-primary); }</style>')
	const { stdout } = await run()
	const result = JSON.parse(stdout)
	expect(result.warnings).toContainEqual(
		expect.objectContaining({
			code: 'css_unused_selector',
			filename: path.relative(fixture, filename),
		})
	)
	expect(await selected(result.directory)).toEqual({ revision: result.revision })
})

test('publishes replacement revisions and retains the previous revision', async () => {
	await configure({ prepared: './prepared' })
	const first = JSON.parse((await run()).stdout)
	await writeFile(path.join(fixture, 'site.svelte'), '<p>Replacement</p>')
	const second = JSON.parse((await run()).stdout)
	expect(second.revision).not.toBe(first.revision)
	expect(await selected(second.directory)).toEqual({ revision: second.revision })
	expect(await readdir(path.join(second.directory, 'revisions'))).toEqual(
		expect.arrayContaining([first.revision, second.revision])
	)
})

test('fails on a missing config instead of silently selecting a default-only bundle', async () => {
	await expect(run()).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('ENOENT') })
	expect(await readdir(fixture)).toEqual([])
	const filename = await configure()
	const published = JSON.parse((await run()).stdout)
	await rm(filename)
	await expect(run()).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('ENOENT') })
	expect(await selected(published.directory)).toEqual({ revision: published.revision })
})

test('keeps the selected revision and CSS untouched after a real compilation failure', async () => {
	await configure({ prepared: './prepared' })
	const first = JSON.parse((await run()).stdout)
	const pointer = await readFile(path.join(first.directory, 'current.json'), 'utf8')
	const css = await readFile(
		path.join(first.directory, 'revisions', first.revision, 'theme.css'),
		'utf8'
	)
	await writeFile(path.join(fixture, 'site.svelte'), '<div>')
	await expect(run()).rejects.toMatchObject({
		code: 1,
		stderr: expect.stringContaining('site.svelte'),
	})
	expect(await readFile(path.join(first.directory, 'current.json'), 'utf8')).toBe(pointer)
	expect(
		await readFile(path.join(first.directory, 'revisions', first.revision, 'theme.css'), 'utf8')
	).toBe(css)
})

test.each([
	['bad YAML', 'paths: ['],
	[
		'invalid security configuration',
		'{"auth":{"credentials":{"username":"admin","password":"secret"}}}',
	],
])('rejects %s without publishing any artifacts', async (_label, source) => {
	await writeFile(path.join(fixture, 'config.yaml'), source)
	await expect(run()).rejects.toMatchObject({ code: 1 })
	expect(await readdir(fixture)).toEqual(['config.yaml'])
})

test.each(['--unknown', '--config', 'unexpected-positional'])(
	'rejects invalid command argument %s',
	async (arg) => {
		await expect(run([arg])).rejects.toMatchObject({ code: 1 })
		expect(await readdir(fixture)).toEqual([])
	}
)
