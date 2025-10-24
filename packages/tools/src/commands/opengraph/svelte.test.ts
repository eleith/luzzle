import { describe, test, expect, vi, afterEach, MockInstance } from 'vitest'
import {
	getSvelteComponent,
	getOpengraphComponentForType,
	getIconComponentForType,
} from './svelte.js'
import { readFile, writeFile } from 'fs/promises'
import { compile } from 'svelte/compiler'
import path from 'path'
import { Config } from '../../lib/config/config.js'
import * as utils from './utils.js'
import { WebPieces } from '../sqlite/index.js'

vi.mock('fs/promises')
vi.mock('svelte/compiler')
vi.mock('path')

const mocks = {
	readFile: vi.mocked(readFile),
	writeFile: vi.mocked(writeFile),
	compile: vi.mocked(compile),
	pathJoin: vi.spyOn(path, 'join'),
	pathDirname: vi.spyOn(path, 'dirname'),
	pathExtname: vi.spyOn(path, 'extname'),
	bufferToBase64: vi.spyOn(utils, 'bufferToBase64'),
	replaceAsync: vi.spyOn(utils, 'replaceAsync'),
}

const spies: { [key: string]: MockInstance } = {}

const mockConfig = {
	paths: {
		database: 'test.db',
		config: '/path/to/config.yaml',
	},
	url: {
		app: 'https://example.com',
		luzzle_assets: 'https://assets.example.com',
		app_assets: 'https://app-assets.example.com',
		editor: 'https://editor.example.com',
	},
	pieces: [
		{
			type: 'book',
			components: {
				opengraph: './components/BookOg.svelte',
				icon: './components/BookIcon.svelte',
			},
			fields: {
				title: 'book_title',
				date_consumed: 'date_read',
			},
		},
		{
			type: 'article',
			components: {
				opengraph: './components/ArticleOg.svelte',
			},
			fields: {
				title: 'article_title',
				date_consumed: 'date_read',
			},
		},
	],
} as Config

describe('src/commands/opengraph/svelte', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('getSvelteComponent should compile and store a svelte component', async () => {
		const sveltePath = './components/test1.svelte'
		const svelteModulePath = './components/test.svelte-hash.js'
		const code = ''

		mocks.pathDirname.mockReturnValue('./tools/src/commands/opengraph')
		mocks.pathJoin.mockReturnValueOnce(svelteModulePath)
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code } } as ReturnType<typeof mocks.compile>)
		mocks.writeFile.mockResolvedValue(undefined)

		const component = await getSvelteComponent(sveltePath)

		expect(mocks.readFile).toHaveBeenCalledOnce()
		expect(mocks.compile).toHaveBeenCalledOnce()
		expect(mocks.writeFile).toHaveBeenCalledOnce()
		expect(component).toBeDefined()
	})

	test('getSvelteComponent should return cached component if already compiled', async () => {
		const sveltePath = './components/test2.svelte'
		const svelteModulePath = './components/test.svelte-hash.js'
		const code = ''

		mocks.pathDirname.mockReturnValue('./tools/src/commands/opengraph')
		mocks.pathJoin.mockReturnValue(svelteModulePath)
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code } } as ReturnType<typeof mocks.compile>)
		mocks.writeFile.mockResolvedValue(undefined)

		await getSvelteComponent(sveltePath)
		await getSvelteComponent(sveltePath)

		expect(mocks.readFile).toHaveBeenCalledOnce()
		expect(mocks.compile).toHaveBeenCalledOnce()
		expect(mocks.writeFile).toHaveBeenCalledOnce()
	})

	test('getSvelteComponent should handle font-face urls', async () => {
		const sveltePath = './components/test3.svelte'
		const svelteModulePath = './components/test.svelte-hash.js'
		const font = Buffer.from('asldbfkjs')
		const code = `
			<style>
				@font-face {
					font-family: 'TestFont';
					src: url(fonts/test-font.woff2) format('woff2');
				}
			</style>
		`

		mocks.pathDirname.mockReturnValue('./tools/src/commands/opengraph')
		mocks.pathJoin.mockReturnValue(svelteModulePath)
		mocks.pathJoin.mockReturnValueOnce('./components/fonts/test-font.woff2')
		mocks.pathExtname.mockReturnValueOnce('.woff2')
		mocks.readFile.mockResolvedValue(code)
		mocks.readFile.mockResolvedValueOnce(font)
		mocks.compile.mockReturnValue({ js: { code } } as ReturnType<typeof mocks.compile>)
		mocks.writeFile.mockResolvedValue(undefined)
		mocks.bufferToBase64.mockResolvedValue('Zm9udGRhdGE=')

		await getSvelteComponent(sveltePath)

		expect(mocks.bufferToBase64).toHaveBeenCalledOnce()
		expect(mocks.replaceAsync).toHaveBeenCalledOnce()
		expect(mocks.readFile).toHaveBeenCalledTimes(2)
		expect(mocks.writeFile).toHaveBeenCalledOnce()
	})

	test('getOpengraphComponentForType should return the correct opengraph component', async () => {
		const sveltePath = './components/test4.svelte'
		const svelteModulePath = './components/test.svelte-hash.js'
		const item = {
			type: 'book',
			id: '1',
			file_path: 'test',
			date_added: 'test',
		} as unknown as WebPieces
		const code = ''

		mocks.pathDirname.mockReturnValue('/path/to')
		mocks.pathJoin.mockReturnValueOnce(sveltePath)
		mocks.pathJoin.mockReturnValueOnce(svelteModulePath)
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code } } as ReturnType<typeof mocks.compile>)
		mocks.writeFile.mockResolvedValue(undefined)

		const component = await getOpengraphComponentForType(item, mockConfig)

		expect(mocks.readFile).toHaveBeenCalledOnce()
		expect(component).toBeDefined()
	})

	test('getOpengraphComponentForType should return null if not found in config', async () => {
		const sveltePath = './components/test5.svelte'
		const svelteModulePath = './components/test.svelte-hash.js'

		const item = {
			type: 'movie',
			id: '1',
			file_path: 'test',
			date_added: 'test',
		} as unknown as WebPieces
		const code = ''

		mocks.pathDirname.mockReturnValue('/mock/path/to')
		mocks.pathJoin.mockReturnValueOnce(sveltePath)
		mocks.pathJoin.mockReturnValueOnce(svelteModulePath)
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code } } as unknown as ReturnType<typeof mocks.compile>)
		mocks.writeFile.mockResolvedValue(undefined)

		const component = await getOpengraphComponentForType(item, mockConfig)

		expect(component).toBeNull()
	})

	test('getIconComponentForType should return the correct icon component', async () => {
		const item = {
			type: 'book',
			id: '1',
			file_path: 'test',
			date_added: 'test',
		} as unknown as WebPieces
		const sveltePath = './components/test.svelte'
		const svelteModulePath = './components/test.svelte-hash.js'
		const code = ''

		mocks.pathDirname.mockReturnValue(
			'/home/eleith/dev/luzzle/packages/tools/src/commands/opengraph'
		)
		mocks.pathJoin.mockReturnValueOnce(sveltePath)
		mocks.pathJoin.mockReturnValueOnce(svelteModulePath)
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code } } as ReturnType<typeof mocks.compile>)

		const component = await getIconComponentForType(item, mockConfig)

		expect(mocks.readFile).toHaveBeenCalledWith(sveltePath, 'utf-8')
		expect(mocks.writeFile).toHaveBeenCalledOnce()
		expect(component).toBeDefined()
	})

	test('getIconComponentForType should return null if icon component not found in config', async () => {
		const item = {
			type: 'article',
			id: '1',
			file_path: 'test',
			date_added: 'test',
		} as unknown as WebPieces
		const sveltePath = './components/test.svelte'
		const svelteModulePath = './components/test.svelte-hash.js'
		const code = ''

		mocks.pathDirname.mockReturnValue('/mock/path/to')
		mocks.pathJoin.mockReturnValueOnce(sveltePath)
		mocks.pathJoin.mockReturnValueOnce(svelteModulePath)
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code } } as ReturnType<typeof mocks.compile>)
		mocks.writeFile.mockResolvedValue(undefined)

		const component = await getIconComponentForType(item, mockConfig)

		expect(component).toBeNull()
	})
})
