import { describe, test, expect, afterAll, beforeAll } from 'vitest'
import { writeFileSync, mkdirSync, rmSync, utimesSync } from 'node:fs'
import path from 'node:path'
import { getCompiledOpengraphModule } from './compile.js'
import type { Config } from '@luzzle/web.config'

const TEMP_DIR = path.join(import.meta.dirname, 'temp-fixtures')

const makeConfig = (opengraphPath: string): Config => ({
	pieces: [
		{
			type: 'books',
			components: {
				opengraph: opengraphPath
			},
			fields: {
				title: 'title',
				date_consumed: 'date_consumed'
			}
		}
	],
	paths: {
		config: path.join(TEMP_DIR, 'config.yaml'),
		database: '',
		assets: '',
		cache: ''
	},
	assets: { salt: 'test' }
}) as unknown as Config

beforeAll(() => {
	mkdirSync(TEMP_DIR, { recursive: true })
})

afterAll(() => {
	rmSync(TEMP_DIR, { recursive: true, force: true })
})

describe('pieces/compile', () => {
	test('compiles a simple Svelte component and caches it', async () => {
		const svelteContent = `
			<script>
				let { name } = $props();
			</script>
			<div>Hello {name}!</div>
		`
		const relPath = './components/book.svelte'
		const absPath = path.resolve(TEMP_DIR, relPath)
		mkdirSync(path.dirname(absPath), { recursive: true })
		writeFileSync(absPath, svelteContent, 'utf8')

		const config = makeConfig(relPath)

		// Compile first time
		const mod1 = await getCompiledOpengraphModule('books', config)
		expect(mod1).toBeDefined()
		expect(mod1.default).toBeTypeOf('function')

		// Compile second time, should return cached
		const mod2 = await getCompiledOpengraphModule('books', config)
		expect(mod2).toBe(mod1)

		// Touch file (update mtime)
		const now = new Date()
		const newTime = new Date(now.getTime() + 5000)
		utimesSync(absPath, newTime, newTime)

		// Compile third time, should return new instance
		const mod3 = await getCompiledOpengraphModule('books', config)
		expect(mod3).not.toBe(mod1)
	})

	test('compiles real book.svelte component', async () => {
		const config: Config = {
			pieces: [
				{
					type: 'books',
					components: {
						opengraph: './content/components/opengraphs/book.svelte'
					}
				}
			],
			paths: {
				config: '/home/eleith/dev/luzzle/packages/web/explorer/demo/config.yaml'
			}
		} as unknown as Config

		const mod = await getCompiledOpengraphModule('books', config)
		expect(mod).toBeDefined()
		expect(mod.default).toBeTypeOf('function')
	})
})
