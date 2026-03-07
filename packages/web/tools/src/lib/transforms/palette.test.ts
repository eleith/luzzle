import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './palette.js'
import type { Config, WebPieces } from '@luzzle/web.utils'
import { Pieces } from '@luzzle/core'

vi.stubGlobal('fetch', vi.fn())

const makeWebPiece = (overrides?: Partial<WebPieces>): WebPieces => ({
	id: '1',
	type: 'books',
	date_updated: 100,
	date_added: 50,
	json_metadata: JSON.stringify({ cover: 'cover.jpg' }),
	file_path: 'book.md',
	key: 'key',
	slug: 'my-book',
	title: 'My Book',
	...overrides,
})

const makeConfig = (overrides?: Partial<Config>): Config =>
	({
		url: { app: 'http://localhost' },
		pieces: [{ type: 'books', fields: { media: ['cover'] } }],
		...overrides,
	}) as unknown as Config

afterEach(() => {
	vi.clearAllMocks()
})

const assetMap = new Map([['cover.jpg', 'assets/cover.jpg']])

describe('transforms/palette', () => {
	test('fetches palette and returns embedded asset record', async () => {
		const mockPieces = {} as unknown as Pieces
		const paletteJson = '{"accent":"#ff0000","background":"#ffffff"}'

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(paletteJson),
		} as unknown as Response)

		const records = await run({ webPiece: makeWebPiece(), config: makeConfig(), outDir: '/out', pieces: mockPieces, assetKeyToPath: assetMap })

		expect(fetch).toHaveBeenCalledWith('http://localhost/api/pieces/books/my-book/transform/palette')
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'palette',
				content: paletteJson,
				mime_type: 'application/json',
				is_embedded: 1,
			}),
		])
	})

	test('throws on error response', async () => {
		const mockPieces = {} as unknown as Pieces

		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		} as unknown as Response)

		await expect(
			run({ webPiece: makeWebPiece(), config: makeConfig(), outDir: '/out', pieces: mockPieces, assetKeyToPath: assetMap })
		).rejects.toThrow('500')
	})

	test('returns empty when piece type has no media fields', async () => {
		const mockPieces = {} as unknown as Pieces
		const configNoMedia = makeConfig({ pieces: [{ type: 'books', fields: {} }] } as unknown as Partial<Config>)

		const records = await run({ webPiece: makeWebPiece(), config: configNoMedia, outDir: '/out', pieces: mockPieces, assetKeyToPath: assetMap })

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('returns empty when piece type not found in config', async () => {
		const mockPieces = {} as unknown as Pieces
		const configOther = makeConfig({ pieces: [{ type: 'other', fields: { media: ['cover'] } }] } as unknown as Partial<Config>)

		const records = await run({ webPiece: makeWebPiece(), config: configOther, outDir: '/out', pieces: mockPieces, assetKeyToPath: assetMap })

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('returns empty when piece has no media values in frontmatter', async () => {
		const mockPieces = {} as unknown as Pieces
		const webPiece = makeWebPiece({ json_metadata: '{}' })

		const records = await run({ webPiece, config: makeConfig(), outDir: '/out', pieces: mockPieces, assetKeyToPath: assetMap })

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('returns empty when media values do not resolve to assets', async () => {
		const mockPieces = {} as unknown as Pieces
		const webPiece = makeWebPiece({ json_metadata: JSON.stringify({ cover: 'unknown.jpg' }) })

		const records = await run({ webPiece, config: makeConfig(), outDir: '/out', pieces: mockPieces, assetKeyToPath: assetMap })

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('throws on network error', async () => {
		const mockPieces = {} as unknown as Pieces

		vi.mocked(fetch).mockRejectedValue(new Error('network error'))

		await expect(
			run({ webPiece: makeWebPiece(), config: makeConfig(), outDir: '/out', pieces: mockPieces, assetKeyToPath: assetMap })
		).rejects.toThrow('network error')
	})
})
