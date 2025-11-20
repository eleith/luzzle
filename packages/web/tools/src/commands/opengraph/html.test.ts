import { describe, test, expect, vi, afterEach, MockInstance } from 'vitest'
import { generateHtml } from './html.js'
import { Pieces, Storage } from '@luzzle/cli'
import { type WebPieces, type Config, type PieceOpengraphProps } from '@luzzle/web.utils'
import { getIconComponentForType, getOpengraphComponentForType } from './svelte.js'
import { findAndReplaceLuzzleUrls, getProps } from './utils.js'
import { render } from 'svelte/server'
import { Component } from 'svelte'

vi.mock('@luzzle/cli')
vi.mock('./svelte.js')
vi.mock('./utils.js')
vi.mock('svelte/server')

const mocks = {
	findAndReplaceLuzzleUrls: vi.mocked(findAndReplaceLuzzleUrls),
	getOpengraphComponentForType: vi.mocked(getOpengraphComponentForType),
	getIconComponentForType: vi.mocked(getIconComponentForType),
	getProps: vi.mocked(getProps),
	render: vi.mocked(render),
}

const spies: { [key: string]: MockInstance } = {}

const mockPieces = new Pieces({} as unknown as Storage)
const mockConfig = {
	paths: { database: 'test.db', config: 'test' },
	url: { app: 'test', luzzle_assets: 'test', app_assets: 'test' },
	text: { title: 'test', description: 'test' },
} as unknown as Config

describe('src/commands/opengraph/html', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
		Object.values(spies).forEach((spy) => {
			spy.mockRestore()
		})
	})

	test('generateHtml should correctly generate HTML for an item', async () => {
		const item = {
			type: 'book',
			id: '1',
			file_path: 'test',
			date_added: 'test',
		} as unknown as WebPieces
		const mockOpenGraphComponent = { render: vi.fn() } as unknown as Component
		const mockIconComponent = { render: vi.fn() } as unknown as Component
		const mockProps = { some: 'props' } as unknown as PieceOpengraphProps
		const mockRenderResult = { head: '<meta name="test" />', body: '<h1>Hello</h1>', html: '--' }

		mocks.getOpengraphComponentForType.mockResolvedValue(mockOpenGraphComponent)
		mocks.getIconComponentForType.mockResolvedValue(mockIconComponent)
		mocks.getProps.mockResolvedValue(mockProps)
		mocks.render.mockResolvedValue(mockRenderResult)
		mocks.findAndReplaceLuzzleUrls.mockResolvedValue(mockRenderResult.body)

		const result = await generateHtml(item, mockPieces, mockConfig)

		expect(mocks.render).toHaveBeenCalledOnce()
		expect(result).toContain(mockRenderResult.head)
		expect(result).toContain(mockRenderResult.body)
	})

	test('generateHtml should skip html generation', async () => {
		const item = {
			type: 'book',
			id: '1',
			file_path: 'test',
			date_added: 'test',
		} as unknown as WebPieces

		mocks.getOpengraphComponentForType.mockResolvedValue(null)

		const html = await generateHtml(item, mockPieces, mockConfig)

		expect(html).toBeNull()
	})

	test('generateHtml should handle errors during HTML generation', async () => {
		const item = {
			type: 'book',
			id: '1',
			file_path: 'test',
			date_added: 'test',
		} as unknown as WebPieces
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

		mocks.getOpengraphComponentForType.mockRejectedValue(new Error('Test Error'))

		await expect(generateHtml(item, mockPieces, mockConfig)).rejects.toThrowError()
		expect(consoleErrorSpy).not.toHaveBeenCalled()
	})
})
