import { describe, test, expect, vi, afterEach, MockInstance, beforeEach } from 'vitest'
import {
	getSvelteComponent,
	getOpengraphComponentForType,
	getIconComponentForType,
} from './svelte.js'
import { readFile, writeFile } from 'fs/promises'
import { compile } from 'svelte/compiler'
import path from 'path'
import { type Config, type WebPieces } from '@luzzle/web.utils'
import * as utils from './utils.js'

vi.mock('fs/promises')
vi.mock('svelte/compiler')

const mockedImportMetaResolve = vi.fn()
vi.mock('import.meta', () => {
	return {
		resolve: mockedImportMetaResolve,
	}
})

const mocks = {
	readFile: vi.mocked(readFile),
	writeFile: vi.mocked(writeFile),
	compile: vi.mocked(compile),
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
	beforeEach(() => {
		// Reset mocks before each test
		Object.values(mocks).forEach((mock) => mock.mockReset())
		// Restore spies before each test
		Object.values(spies).forEach((spy) => spy.mockRestore())

		spies.pathBasename = vi.spyOn(path, 'basename')
		spies.pathDirname = vi.spyOn(path, 'dirname')
		spies.pathJoin = vi.spyOn(path, 'join')
		spies.pathExtname = vi.spyOn(path, 'extname')
		spies.bufferToBase64 = vi.spyOn(utils, 'bufferToBase64')
		spies.consoleError = vi.spyOn(console, 'error').mockImplementation(() => { })
	})

	afterEach(() => {
		// Clear all mocks after each test
		vi.clearAllMocks()
	})

	test('getSvelteComponent should compile and store a svelte component', async () => {
		const sveltePath = './components/test1.svelte'
		const code = '<p>Hello</p>'
		const compiledCode = 'export default { test: "component" }'

		spies.pathBasename.mockReturnValue('test1.svelte')
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code: compiledCode } } as ReturnType<
			typeof mocks.compile
		>)

		const component = await getSvelteComponent(sveltePath)

		expect(mocks.readFile).toHaveBeenCalledOnce()
		expect(mocks.compile).toHaveBeenCalledOnce()
		expect(mocks.writeFile).not.toHaveBeenCalled()
		expect(component).toEqual({ test: 'component' })
	})

	test('getSvelteComponent should return cached component if already compiled', async () => {
		const sveltePath = './components/test2.svelte'
		const code = '<p>Hello</p>'
		const compiledCode = 'export default { test: "component2" }'

		spies.pathBasename.mockReturnValue('test2.svelte')
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code: compiledCode } } as ReturnType<
			typeof mocks.compile
		>)

		await getSvelteComponent(sveltePath)
		await getSvelteComponent(sveltePath)

		expect(mocks.readFile).toHaveBeenCalledOnce()
		expect(mocks.compile).toHaveBeenCalledOnce()
	})

	test('getSvelteComponent should handle font-face urls', async () => {
		const sveltePath = './components/test3.svelte'
		const fontPath = './components/fonts/test-font.woff2'
		const fontBuffer = Buffer.from('fontdata')
		const svelteCodeWithFont = `<style>@font-face { src: url(fonts/test-font.woff2); }</style>`
		const compiledCode = `const css = "src: url(fonts/test-font.woff2)";\nexport default {};`

		spies.pathBasename.mockReturnValue('test3.svelte')
		spies.pathDirname.mockReturnValue('./components')
		spies.pathJoin.mockReturnValue(fontPath)
		spies.pathExtname.mockReturnValue('.woff2')
		spies.bufferToBase64.mockReturnValue('Zm9udGRhdGE=')

		mocks.readFile.mockResolvedValueOnce(svelteCodeWithFont)
		mocks.readFile.mockResolvedValueOnce(fontBuffer)
		mocks.compile.mockReturnValue({ js: { code: compiledCode } } as ReturnType<
			typeof mocks.compile
		>)

		spies.encodeURIComponent = vi.spyOn(global, 'encodeURIComponent')
		await getSvelteComponent(sveltePath)

		expect(mocks.readFile).toHaveBeenCalledTimes(2)
		const finalCode = decodeURIComponent(spies.encodeURIComponent.mock.calls[0][0])
		expect(finalCode).toContain('src: url(data:font/woff2;base64,Zm9udGRhdGE=)')
	})

	test('replaceImportsInCompiledCode should ignore relative paths', async () => {
		const sveltePath = './components/test5.svelte'
		const code = `<script>import './local.js';</script>`
		const compiledCode = `import './local.js';\nexport default {};`

		spies.pathBasename.mockReturnValue('test5.svelte')
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code: compiledCode } } as ReturnType<
			typeof mocks.compile
		>)

		spies.encodeURIComponent = vi
			.spyOn(global, 'encodeURIComponent')
			.mockImplementation((str: string | number | boolean): string => {
				expect(str).toContain(`import './local.js'`)
				throw new Error('Stop execution')
			})

		await expect(getSvelteComponent(sveltePath)).rejects.toThrow('Stop execution')
		expect(mockedImportMetaResolve).not.toHaveBeenCalled()
	})

	test('replaceImportsInCompiledCode should handle resolution errors', async () => {
		const sveltePath = './components/test-bad-module.svelte'
		const code = `<script>import 'bad-module';</script>`
		const compiledCode = `import 'bad-module';\nexport default {};`

		spies.pathBasename.mockReturnValue('test-bad-module.svelte')
		mocks.readFile.mockResolvedValue(code)
		mocks.compile.mockReturnValue({ js: { code: compiledCode } } as ReturnType<
			typeof mocks.compile
		>)

		spies.encodeURIComponent = vi
			.spyOn(global, 'encodeURIComponent')
			.mockImplementation((str: string | number | boolean): string => {
				expect(str).toContain(`import 'bad-module'`)
				throw new Error('Stop execution')
			})

		await expect(getSvelteComponent(sveltePath)).rejects.toThrow('Stop execution')

		expect(spies.consoleError).toHaveBeenCalledWith(
			'Could not resolve module: bad-module',
			expect.any(Error)
		)
	})

	test('getOpengraphComponentForType should return the correct opengraph component', async () => {
		const item = { type: 'book' } as WebPieces
		const sveltePath = '/path/to/components/BookOg.svelte'
		const compiledCode = 'export default { isOg: true }'

		spies.pathDirname.mockReturnValue('/path/to')
		spies.pathJoin.mockReturnValue(sveltePath)
		spies.pathBasename.mockReturnValue('BookOg.svelte')
		mocks.readFile.mockResolvedValue('')
		mocks.compile.mockReturnValue({ js: { code: compiledCode } } as ReturnType<
			typeof mocks.compile
		>)

		const component = await getOpengraphComponentForType(item, mockConfig)

		expect(spies.pathJoin).toHaveBeenCalledWith('/path/to', './components/BookOg.svelte')
		expect(mocks.readFile).toHaveBeenCalledWith(sveltePath, 'utf-8')
		expect(component).toEqual({ isOg: true })
	})

	test('getOpengraphComponentForType should return null if not found in config', async () => {
		const item = { type: 'movie' } as unknown as WebPieces
		const component = await getOpengraphComponentForType(item, mockConfig)
		expect(component).toBeNull()
	})

	test('getIconComponentForType should return the correct icon component', async () => {
		const item = { type: 'book' } as WebPieces
		const sveltePath = '/path/to/components/BookIcon.svelte'
		const compiledCode = 'export default { isIcon: true }'

		spies.pathDirname.mockReturnValue('/path/to')
		spies.pathJoin.mockReturnValue(sveltePath)
		spies.pathBasename.mockReturnValue('BookIcon.svelte')
		mocks.readFile.mockResolvedValue('')
		mocks.compile.mockReturnValue({ js: { code: compiledCode } } as ReturnType<
			typeof mocks.compile
		>)

		const component = await getIconComponentForType(item, mockConfig)

		expect(spies.pathJoin).toHaveBeenCalledWith('/path/to', './components/BookIcon.svelte')
		expect(mocks.readFile).toHaveBeenCalledWith(sveltePath, 'utf-8')
		expect(component).toEqual({ isIcon: true })
	})

	test('getIconComponentForType should return null if icon component not found in config', async () => {
		const item = { type: 'article' } as unknown as WebPieces
		const component = await getIconComponentForType(item, mockConfig)
		expect(component).toBeNull()
	})
})
