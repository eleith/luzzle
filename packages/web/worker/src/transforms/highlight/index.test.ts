import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './index.js'
import { codeToHtml } from 'shiki'
import { getLang } from './lang.js'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../../services/db.js'
import { Pieces } from '@luzzle/core'
import { makeLogger } from '../../../test/logger.js'

vi.mock('shiki', () => ({
	codeToHtml: vi.fn(),
}))
vi.mock('./lang.js', () => ({
	getLang: vi.fn(),
}))

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
		theme: { markdown: { code: { light: 'github-light', dark: 'github-dark' } } },
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

const makePieces = (content: string = 'console.log("hi")') =>
	({ getPieceAsset: vi.fn().mockResolvedValue(Buffer.from(content)) }) as unknown as Pieces

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/highlight', () => {
	test('returns empty array when piece type has no attachments config', async () => {
		const pieces = makePieces()

		const records = await run({
			webPiece: makeWebPiece('{}'),
			config: makeConfig(),
			outDir: '/out',
			pieces,
			assetKeyToPath: emptyMap,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).not.toHaveBeenCalled()
		expect(codeToHtml).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('reads asset, detects language, and highlights via shiki', async () => {
		const pieces = makePieces('console.log("hi")')
		const html = '<pre class="shiki">...</pre>'
		vi.mocked(getLang).mockReturnValue('javascript')
		vi.mocked(codeToHtml).mockResolvedValue(html)

		const records = await run({
			webPiece: makeWebPiece('{"code": "key"}'),
			config: makeConfig(['code']),
			outDir: '/out',
			pieces,
			assetKeyToPath: new Map([['key', 'main.js']]),
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).toHaveBeenCalledWith('main.js')
		expect(getLang).toHaveBeenCalledWith('main.js')
		expect(codeToHtml).toHaveBeenCalledWith('console.log("hi")', {
			lang: 'javascript',
			defaultColor: false,
			themes: { light: 'github-light', dark: 'github-dark' },
		})
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

	test('skips keys missing from assetKeyToPath without reading or highlighting', async () => {
		const pieces = makePieces()

		const records = await run({
			webPiece: makeWebPiece('{"doc": "missing-key"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces,
			assetKeyToPath: emptyMap,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('falls back to "text" when getLang returns null', async () => {
		const pieces = makePieces('plain text')
		vi.mocked(getLang).mockReturnValue(null)
		vi.mocked(codeToHtml).mockResolvedValue('<pre>...</pre>')

		await run({
			webPiece: makeWebPiece('{"doc": "key"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces,
			assetKeyToPath: new Map([['key', 'notes.unknown']]),
			logger: makeLogger(),
		})

		expect(codeToHtml).toHaveBeenCalledWith(
			'plain text',
			expect.objectContaining({ lang: 'text' })
		)
	})

	test('throws on shiki error', async () => {
		const pieces = makePieces()
		vi.mocked(getLang).mockReturnValue('javascript')
		vi.mocked(codeToHtml).mockRejectedValue(new Error('shiki failed'))

		await expect(
			run({
				webPiece: makeWebPiece('{"code": "key"}'),
				config: makeConfig(['code']),
				outDir: '/out',
				pieces,
				assetKeyToPath: new Map([['key', 'main.js']]),
				logger: makeLogger(),
			})
		).rejects.toThrow('shiki failed')
	})

	test('produces one record per attachment', async () => {
		const pieces = makePieces('content')
		vi.mocked(getLang).mockReturnValue('javascript')
		vi.mocked(codeToHtml).mockResolvedValue('<pre class="shiki">...</pre>')

		const map = new Map([
			['key1', 'main.js'],
			['key2', 'report.pdf'],
			['key3', 'app.ts'],
		])
		const records = await run({
			webPiece: makeWebPiece('{"files": ["key1", "key2", "key3"]}'),
			config: makeConfig(['files']),
			outDir: '/out',
			pieces,
			assetKeyToPath: map,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).toHaveBeenCalledTimes(3)
		expect(records).toHaveLength(3)
		expect(records.map((r) => r.piece_asset_path)).toEqual(['main.js', 'report.pdf', 'app.ts'])
	})

	test('returns empty array for piece type not in config', async () => {
		const pieces = makePieces()
		const webPiece = { ...makeWebPiece('{"code": "main.js"}'), type: 'unknown' }

		const records = await run({
			webPiece,
			config: makeConfig(['code']),
			outDir: '/out',
			pieces,
			assetKeyToPath: emptyMap,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})
})
