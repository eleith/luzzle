import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './markdown.js'
import type { Config, WebPieces } from '@luzzle/web.utils'
import type { Pieces } from '@luzzle/core'

vi.stubGlobal('fetch', vi.fn())

const makeWebPiece = (overrides?: Partial<WebPieces>): WebPieces => ({
	id: '1',
	type: 'books',
	date_updated: 100,
	date_added: 50,
	json_metadata: JSON.stringify({ description: 'A **great** book' }),
	file_path: 'book.md',
	key: 'key',
	slug: 'my-book',
	title: 'My Book',
	note: '# Hello\n\nWorld',
	...overrides,
})

const makeConfig = (): Config =>
	({
		url: { app: 'http://localhost' },
		pieces: [{ type: 'books', fields: { title: 'title', date_consumed: 'date_consumed' } }],
	}) as unknown as Config

const makePieces = (fields: Array<{ name: string; type: string; format?: string }> = []): Pieces =>
	({
		getPiece: vi.fn().mockResolvedValue({ fields }),
	}) as unknown as Pieces

const emptyMap = new Map<string, string>()

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/markdown', () => {
	test('renders note and returns embedded asset record', async () => {
		const html = '<section class="markdown"><h1>Hello</h1>\n<p>World</p></section>'
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(html),
		} as unknown as Response)

		const records = await run({
			webPiece: makeWebPiece(),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces(),
			assetKeyToPath: emptyMap,
		})

		expect(fetch).toHaveBeenCalledWith('http://localhost/api/pieces/books/my-book/transform/markdown')
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'markdown',
				piece_asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content: html,
			}),
		])
	})

	test('returns empty when piece has no note and no markdown fields', async () => {
		const records = await run({
			webPiece: makeWebPiece({ note: undefined }),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces(),
			assetKeyToPath: emptyMap,
		})

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('throws on error response for note', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		} as unknown as Response)

		await expect(
			run({
				webPiece: makeWebPiece(),
				config: makeConfig(),
				outDir: '/out',
				pieces: makePieces(),
				assetKeyToPath: emptyMap,
			})
		).rejects.toThrow('500')
	})

	test('renders metadata field with format markdown', async () => {
		const html = '<section class="markdown"><p>A <strong>great</strong> book</p></section>'
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(html),
		} as unknown as Response)

		const records = await run({
			webPiece: makeWebPiece({ note: undefined }),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces([{ name: 'description', type: 'string', format: 'markdown' }]),
			assetKeyToPath: emptyMap,
		})

		expect(fetch).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/transform/markdown?field=description'
		)
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'markdown.description',
				piece_asset_path: null,
				piece_field_path: 'description',
				mime_type: 'text/html',
				is_embedded: 1,
				content: html,
			}),
		])
	})

	test('skips metadata fields that are empty or missing in frontmatter', async () => {
		const records = await run({
			webPiece: makeWebPiece({ note: undefined, json_metadata: '{}' }),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces([{ name: 'description', type: 'string', format: 'markdown' }]),
			assetKeyToPath: emptyMap,
		})

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('renders both note and metadata fields', async () => {
		const html = '<section class="markdown"><p>content</p></section>'
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(html),
		} as unknown as Response)

		const records = await run({
			webPiece: makeWebPiece(),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces([{ name: 'description', type: 'string', format: 'markdown' }]),
			assetKeyToPath: emptyMap,
		})

		expect(fetch).toHaveBeenCalledTimes(2)
		expect(records).toHaveLength(2)
		expect(records[0].transformation).toBe('markdown')
		expect(records[0].piece_asset_path).toBeNull()
		expect(records[1].transformation).toBe('markdown.description')
		expect(records[1].piece_asset_path).toBeNull()
		expect(records[1].piece_field_path).toBe('description')
	})

	test('returns empty when piece type has no markdown fields and no note', async () => {
		const records = await run({
			webPiece: makeWebPiece({ note: undefined }),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces([{ name: 'title', type: 'string' }]),
			assetKeyToPath: emptyMap,
		})

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('throws on error response for metadata field', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		} as unknown as Response)

		await expect(
			run({
				webPiece: makeWebPiece({ note: undefined }),
				config: makeConfig(),
				outDir: '/out',
				pieces: makePieces([{ name: 'description', type: 'string', format: 'markdown' }]),
				assetKeyToPath: emptyMap,
			})
		).rejects.toThrow('500')
	})

	test('throws on network error', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('network error'))

		await expect(
			run({
				webPiece: makeWebPiece(),
				config: makeConfig(),
				outDir: '/out',
				pieces: makePieces(),
				assetKeyToPath: emptyMap,
			})
		).rejects.toThrow('network error')
	})
})
