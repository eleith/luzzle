import { describe, test, expect, vi, afterEach } from 'vitest'
import { run, cleanup } from './opengraph.js'
import { getBrowser, closeBrowser } from '../utils/browser.js'
import { generatePngFromUrl } from '../utils/png.js'
import { getOpenGraphPath } from '../assets/paths.js'
import { type Config } from '@luzzle/web.config'
import type { WebPieces } from '../services/db.js'
import { Pieces } from '@luzzle/core'
import { Browser } from 'puppeteer'
import { makeLogger } from '../../test/logger.js'

vi.mock('../utils/browser.js', () => ({
	getBrowser: vi.fn(),
	closeBrowser: vi.fn(),
}))
vi.mock('../utils/png.js')
vi.mock('../assets/paths.js')

const mocks = {
	getBrowser: vi.mocked(getBrowser),
	closeBrowser: vi.mocked(closeBrowser),
	generatePngFromUrl: vi.mocked(generatePngFromUrl),
	getOpenGraphPath: vi.mocked(getOpenGraphPath),
}

const makeWebPiece = (): WebPieces => ({
	id: '1',
	type: 'books',
	date_updated: 100,
	date_added: 50,
	json_metadata: '{}',
	file_path: 'book.md',
	key: 'key',
	slug: 'my-book',
	title: 'My Book',
})

const makeConfig = (): Config =>
	({
		pieces: [{ type: 'books', fields: { title: 'title' } }],
		assets: { salt: 'test-salt' },
		url: { app: 'http://localhost' },
	}) as unknown as Config

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/opengraph', () => {
	test('generates opengraph image and returns asset record', async () => {
		const mockPieces = {} as unknown as Pieces
		const browser = { close: vi.fn() }

		mocks.getOpenGraphPath.mockReturnValue('books/key/opengraph.png')
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)
		mocks.generatePngFromUrl.mockResolvedValue(Buffer.from('png'))

		const records = await run({ webPiece: makeWebPiece(), config: makeConfig(), outDir: '/out', pieces: mockPieces, assetKeyToPath: new Map(), logger: makeLogger() })

		expect(mocks.getBrowser).toHaveBeenCalledOnce()
		expect(mocks.generatePngFromUrl).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/render/opengraph',
			browser,
			'/out/books/key/opengraph.png'
		)
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'opengraph',
				mime_type: 'image/png',
			}),
		])
	})

	test('throws on puppeteer error', async () => {
		const mockPieces = {} as unknown as Pieces
		const browser = { close: vi.fn() }

		mocks.getOpenGraphPath.mockReturnValue('books/key/opengraph.png')
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)
		mocks.generatePngFromUrl.mockRejectedValue(new Error('puppeteer error'))

		await expect(
			run({ webPiece: makeWebPiece(), config: makeConfig(), outDir: '/out', pieces: mockPieces, assetKeyToPath: new Map(), logger: makeLogger() })
		).rejects.toThrow('puppeteer error')
	})

	test('cleanup calls closeBrowser', async () => {
		await cleanup()

		expect(mocks.closeBrowser).toHaveBeenCalledOnce()
	})
})
