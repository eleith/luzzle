import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './palette.js'
import type { Config, WebPieces } from '@luzzle/web.utils'
import { Pieces } from '@luzzle/core'

vi.stubGlobal('fetch', vi.fn())

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
		url: { app: 'http://localhost' },
	}) as unknown as Config

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/palette', () => {
	test('fetches palette and returns embedded asset record', async () => {
		const mockPieces = {} as unknown as Pieces
		const paletteJson = '{"accent":"#ff0000","background":"#ffffff"}'

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(paletteJson),
		} as unknown as Response)

		const records = await run({ webPiece: makeWebPiece(), config: makeConfig(), outDir: '/out', pieces: mockPieces })

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

	test('returns empty on 404', async () => {
		const mockPieces = {} as unknown as Pieces

		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			status: 404,
		} as unknown as Response)

		const records = await run({ webPiece: makeWebPiece(), config: makeConfig(), outDir: '/out', pieces: mockPieces })

		expect(records).toEqual([])
	})

	test('throws on non-404 error response', async () => {
		const mockPieces = {} as unknown as Pieces

		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		} as unknown as Response)

		await expect(
			run({ webPiece: makeWebPiece(), config: makeConfig(), outDir: '/out', pieces: mockPieces })
		).rejects.toThrow('500')
	})

	test('throws on network error', async () => {
		const mockPieces = {} as unknown as Pieces

		vi.mocked(fetch).mockRejectedValue(new Error('network error'))

		await expect(
			run({ webPiece: makeWebPiece(), config: makeConfig(), outDir: '/out', pieces: mockPieces })
		).rejects.toThrow('network error')
	})
})
