import { describe, test, expect, vi, afterEach } from 'vitest'
import { run, cleanup } from './opengraph.js'
import { mockKysely } from '../database.mock.js'
import { getBrowser, closeBrowser } from '../utils/browser.js'
import { generatePngFromUrl } from '../utils/png.js'
import { getOpenGraphPath, type Config } from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { Pieces } from '@luzzle/core'
import type { LuzzleSelectable } from '@luzzle/core'
import { Browser } from 'puppeteer'

vi.mock('../utils/browser.js', () => ({
	getBrowser: vi.fn(),
	closeBrowser: vi.fn(),
}))
vi.mock('../utils/png.js')
vi.mock('@luzzle/web.utils')
vi.mock('@luzzle/web.utils/server')

const mocks = {
	getBrowser: vi.mocked(getBrowser),
	closeBrowser: vi.mocked(closeBrowser),
	generatePngFromUrl: vi.mocked(generatePngFromUrl),
	getOpenGraphPath: vi.mocked(getOpenGraphPath),
	generateAssetKey: vi.mocked(generateAssetKey),
}

const makeItem = (): LuzzleSelectable<'pieces_items'> => ({
	id: '1',
	type: 'books',
	date_updated: 100,
	date_added: 50,
	frontmatter_json: '{}',
	file_path: 'book.md',
	note_markdown: '',
	assets_json_array: '[]',
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
	test('does nothing if web_pieces row not found', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = {} as unknown as Pieces
		mocks.generateAssetKey.mockReturnValue('key')
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue(undefined)

		await run({ item: makeItem(), config: makeConfig(), outDir: '/out', pieces: mockPieces, db })

		expect(mocks.getBrowser).not.toHaveBeenCalled()
		expect(mocks.generatePngFromUrl).not.toHaveBeenCalled()
	})

	test('generates opengraph image and records in DB', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = {} as unknown as Pieces
		const browser = { close: vi.fn() }

		mocks.generateAssetKey.mockReturnValue('key')
		mocks.getOpenGraphPath.mockReturnValue('books/key/opengraph.png')
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)
		mocks.generatePngFromUrl.mockResolvedValue(Buffer.from('png'))
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue({ slug: 'my-book', key: 'key' })
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		await run({ item: makeItem(), config: makeConfig(), outDir: '/out', pieces: mockPieces, db })

		expect(mocks.getBrowser).toHaveBeenCalledOnce()
		expect(mocks.generatePngFromUrl).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/opengraph?mode=local',
			browser,
			'/out/books/key/opengraph.png'
		)
		expect(db.insertInto).toHaveBeenCalledWith('web_pieces_assets')
		expect(queries.values).toHaveBeenCalledWith(
			expect.objectContaining({
				piece_file_path: 'book.md',
				transformation: 'opengraph',
				mime_type: 'image/png',
			})
		)
	})

	test('handles errors gracefully without throwing', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = {} as unknown as Pieces
		const browser = { close: vi.fn() }
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		mocks.generateAssetKey.mockReturnValue('key')
		mocks.getOpenGraphPath.mockReturnValue('books/key/opengraph.png')
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)
		mocks.generatePngFromUrl.mockRejectedValue(new Error('puppeteer error'))
		vi.spyOn(queries, 'executeTakeFirst').mockResolvedValue({ slug: 'my-book', key: 'key' })

		await run({ item: makeItem(), config: makeConfig(), outDir: '/out', pieces: mockPieces, db })

		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[error] opengraph'))
		expect(db.insertInto).not.toHaveBeenCalled()
		consoleErrorSpy.mockRestore()
	})

	test('cleanup calls closeBrowser', async () => {
		await cleanup()

		expect(mocks.closeBrowser).toHaveBeenCalledOnce()
	})
})
