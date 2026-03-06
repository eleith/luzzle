import { describe, test, expect, vi, afterEach } from 'vitest'
import { run, getHighlightLang } from './highlight.js'
import type { Config, WebPieces } from '@luzzle/web.utils'
import { Pieces } from '@luzzle/core'

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

describe('getHighlightLang', () => {
	test('returns language ID for known code extensions', () => {
		expect(getHighlightLang('main.js')).toBe('javascript')
		expect(getHighlightLang('app.ts')).toBe('typescript')
		expect(getHighlightLang('script.py')).toBe('python')
		expect(getHighlightLang('main.go')).toBe('go')
		expect(getHighlightLang('Main.java')).toBe('java')
		expect(getHighlightLang('lib.rs')).toBe('rust')
	})

	test('returns null for non-code file extensions', () => {
		expect(getHighlightLang('document.pdf')).toBeNull()
		expect(getHighlightLang('photo.jpg')).toBeNull()
		expect(getHighlightLang('archive.zip')).toBeNull()
		expect(getHighlightLang('data.xlsx')).toBeNull()
	})

	test('returns null for filenames with no extension', () => {
		expect(getHighlightLang('Makefile')).toBeNull()
		expect(getHighlightLang('LICENSE')).toBeNull()
	})

	test('is case-insensitive for the extension', () => {
		expect(getHighlightLang('main.JS')).toBe('javascript')
		expect(getHighlightLang('app.TS')).toBe('typescript')
	})
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
			assetKeyToPath: new Map([["key", "main.js"]]),
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

	test('skips non-code files without making an API call', async () => {
		const mockPieces = {} as unknown as Pieces

		const records = await run({
			webPiece: makeWebPiece('{"doc": "report.pdf"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: emptyMap,
		})

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
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
				assetKeyToPath: new Map([["key", "main.js"]]),
			})
		).rejects.toThrow('500')
	})

	test('produces one record per code file and skips non-code files', async () => {
		const mockPieces = {} as unknown as Pieces
		const html = '<pre class="shiki">...</pre>'

		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(html),
		} as unknown as Response)

		const map = new Map([["key1", "main.js"], ["key2", "report.pdf"], ["key3", "app.ts"]])
		const records = await run({
			webPiece: makeWebPiece('{"files": ["key1", "key2", "key3"]}'),
			config: makeConfig(['files']),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: map,
		})

		expect(fetch).toHaveBeenCalledTimes(2)
		expect(records).toHaveLength(2)
		expect(records[0].piece_asset_path).toBe('main.js')
		expect(records[1].piece_asset_path).toBe('app.ts')
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
		})

		expect(fetch).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})
})
