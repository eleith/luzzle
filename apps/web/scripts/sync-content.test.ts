import { afterEach, beforeEach, expect, test } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const script = fileURLToPath(new URL('./sync-content.js', import.meta.url))
const cache = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url))
let directory: string
let output: string

beforeEach(async () => {
	await mkdir(cache, { recursive: true })
	directory = await mkdtemp(path.join(cache, 'sync-site-content-'))
	output = path.join(directory, 'src/lib/content/components/custom')
	await mkdir(output, { recursive: true })
})
afterEach(async () => {
	await rm(directory, { recursive: true, force: true })
})

async function sync(
	component: Record<string, string>,
	pieces: Array<{ type: string; components: Record<string, string> }> = []
) {
	await writeFile(
		path.join(directory, 'config.yaml'),
		JSON.stringify({
			content: { component },
			pieces: pieces.map((piece) => ({
				...piece,
				fields: { title: 'title', date_consumed: 'date' }
			}))
		})
	)
	return exec(process.execPath, [script], { cwd: directory, timeout: 10000 })
}

test('retires only the generated feed, preserves author sources and still copies other roles', async () => {
	const component: Record<string, string> = {}
	for (const role of ['feed', 'root', '404', 'error']) {
		component[role] = path.join(directory, `${role}.svelte`)
		await writeFile(component[role], `author ${role}`)
		await writeFile(path.join(output, `${role}.svelte`), `old generated ${role}`)
	}
	await sync(component)
	await expect(readFile(path.join(output, 'feed.svelte'))).rejects.toMatchObject({ code: 'ENOENT' })
	for (const role of Object.keys(component)) {
		expect(await readFile(component[role], 'utf8')).toBe(`author ${role}`)
		if (role !== 'feed')
			expect(await readFile(path.join(output, `${role}.svelte`), 'utf8')).toBe(`author ${role}`)
	}
})

test('does not read or copy a feed source owned by worker preparation', async () => {
	await writeFile(path.join(output, 'feed.svelte'), 'retired legacy feed')
	await sync({ feed: './not-mounted-in-web/feed.svelte' })
	await expect(readFile(path.join(output, 'feed.svelte'))).rejects.toMatchObject({ code: 'ENOENT' })
})

test.each(['file', 'directory'])(
	'preserves a configured source through a %s symlink',
	async (kind) => {
		const source = path.join(output, 'feed.svelte')
		const alias = path.join(directory, 'author-source')
		await writeFile(source, 'configured aliased source')
		await symlink(kind === 'file' ? source : output, alias, kind === 'file' ? 'file' : 'dir')
		const configured = kind === 'file' ? alias : path.join(alias, 'feed.svelte')
		await sync({ feed: configured })
		expect(await readFile(source, 'utf8')).toBe('configured aliased source')
		expect(await readFile(configured, 'utf8')).toBe('configured aliased source')
	}
)

test.each(['file', 'directory'])(
	'preserves a configured piece source through a %s symlink',
	async (kind) => {
		const source = path.join(output, 'feed.svelte')
		const alias = path.join(directory, 'piece-source')
		await writeFile(source, 'configured aliased piece source')
		await symlink(kind === 'file' ? source : output, alias, kind === 'file' ? 'file' : 'dir')
		const configured = kind === 'file' ? alias : path.join(alias, 'feed.svelte')
		await sync({}, [{ type: 'notes', components: { icon: configured } }])
		expect(await readFile(source, 'utf8')).toBe('configured aliased piece source')
		expect(await readFile(configured, 'utf8')).toBe('configured aliased piece source')
	}
)

test.each(['icon', 'page', 'opengraph'])(
	'preserves a configured piece %s source at the old generated path',
	async (role) => {
		const source = path.join(output, 'feed.svelte')
		await writeFile(source, 'configured piece source')
		await sync({}, [{ type: 'notes', components: { [role]: source } }])
		expect(await readFile(source, 'utf8')).toBe('configured piece source')
	}
)

test.each(['feed', 'root'])(
	'preserves a configured %s source at the old generated path',
	async (role) => {
		const source = path.join(output, 'feed.svelte')
		await writeFile(source, 'configured author source')
		await sync({ [role]: './src/lib/content/components/custom/feed.svelte' })
		expect(await readFile(source, 'utf8')).toBe('configured author source')
		if (role === 'root')
			expect(await readFile(path.join(output, 'root.svelte'), 'utf8')).toBe(
				'configured author source'
			)
	}
)
