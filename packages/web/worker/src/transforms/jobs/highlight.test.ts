import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './highlight.js'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../../db.js'
import { Pieces } from '@luzzle/core'
import { makeLogger } from '../../../test/logger.js'

vi.stubGlobal('fetch', vi.fn())

const emptyMap = new Map<string, string>()

const makeWebPiece = (json_metadata = '{}'): WebPieces => ({
	id: '1',
	type: 'books',
	date_updated: 100,
	date_added: 50,
	json_metadata,
	file_path: 'book.md',
	key: 'key123',
	slug: 'my-book',
	title: 'My Book',
})

const makeConfig = (attachments?: string[]): Config =>
	({
		url: { app: 'http://localhost' },
		pieces: [
			{
				type: 'books',
				fields: {
					title: 'title',
					date_consumed: 'date_consumed',
					...(attachments ? { attachments } : {}),
				},
			},
		],
	}) as unknown as Config

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/highlight', () => {
	test('returns empty array when piece type has no attachments config', async () => {
		const mockPieces = {} as unknown as Pieces

		const records = await run({
			webPiece: makeWebPiece('{}'),
			config: makeConfig(),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: emptyMap,
			logger: makeLogger()
		})

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('fetches highlight and returns embedded asset record for code file', async () => {
		const mockPieces = {} as unknown as Pieces
		const html = '<pre class="shiki">...</pre>'

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(html),
		} as unknown as Response)

		const records = await run({
			webPiece: makeWebPiece('{"code": "key"}'),
			config: makeConfig(['code']),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: new Map([['key', 'main.js']]),
			logger: makeLogger()
		})

		expect(fetch).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/transform/highlight?attachment=key'
		)
		expect(records).toEqual([
			{
				transformation: 'highlight',
				piece_asset_path: 'main.js',
				asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content: html,
			},
		])
	})

	test('skips keys missing from assetKeyToPath without making an API call', async () => {
		const mockPieces = {} as unknown as Pieces

		const records = await run({
			webPiece: makeWebPiece('{"doc": "missing-key"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: emptyMap,
			logger: makeLogger()
		})

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('produces a record for non-code files (server renders them as text)', async () => {
		const mockPieces = {} as unknown as Pieces
		const html = '<pre>...</pre>'

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(html),
		} as unknown as Response)

		const records = await run({
			webPiece: makeWebPiece('{"doc": "key"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: new Map([['key', 'notes.txt']]),
			logger: makeLogger()
		})

		expect(fetch).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/transform/highlight?attachment=key'
		)
		expect(records).toHaveLength(1)
		expect(records[0].piece_asset_path).toBe('notes.txt')
	})

	test('throws on error response', async () => {
		const mockPieces = {} as unknown as Pieces

		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		} as unknown as Response)

		await expect(
			run({
				webPiece: makeWebPiece('{"code": "key"}'),
				config: makeConfig(['code']),
				outDir: '/out',
				pieces: mockPieces,
				assetKeyToPath: new Map([['key', 'main.js']]),
				logger: makeLogger()
			})
		).rejects.toThrow('500')
	})

	test('produces one record per attachment regardless of extension', async () => {
		const mockPieces = {} as unknown as Pieces
		const html = '<pre class="shiki">...</pre>'

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(html),
		} as unknown as Response)

		const map = new Map([
			['key1', 'main.js'],
			['key2', 'report.pdf'],
			['key3', 'app.ts'],
		])
		const records = await run({
			webPiece: makeWebPiece('{"files": ["key1", "key2", "key3"]}'),
			config: makeConfig(['files']),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: map,
			logger: makeLogger()
		})

		expect(fetch).toHaveBeenCalledTimes(3)
		expect(records).toHaveLength(3)
		expect(records.map((r) => r.piece_asset_path)).toEqual(['main.js', 'report.pdf', 'app.ts'])
	})

	test('returns empty array for piece type not in config', async () => {
		const mockPieces = {} as unknown as Pieces
		const webPiece = { ...makeWebPiece('{"code": "main.js"}'), type: 'unknown' }

		const records = await run({
			webPiece,
			config: makeConfig(['code']),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: emptyMap,
			logger: makeLogger()
		})

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})
})
