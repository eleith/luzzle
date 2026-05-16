import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './palette.js'
import { getPalette } from '../../lib/palette.js'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../../db.js'
import { Pieces } from '@luzzle/core'
import { makeLogger } from '../../../test/logger.js'

vi.mock('../../lib/palette.js', () => ({
	getPalette: vi.fn(),
}))

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

const makePieces = (buffer: Buffer = Buffer.from('img')) =>
	({ getPieceAsset: vi.fn().mockResolvedValue(buffer) }) as unknown as Pieces

afterEach(() => {
	vi.clearAllMocks()
})

const assetMap = new Map([['cover.jpg', 'assets/cover.jpg']])

describe('transforms/palette', () => {
	test('reads asset from pieces and returns embedded palette JSON', async () => {
		const buffer = Buffer.from('image-bytes')
		const pieces = makePieces(buffer)
		const palette = { accent: '#ff0000', background: '#ffffff' }
		vi.mocked(getPalette).mockResolvedValue(palette)

		const records = await run({
			webPiece: makeWebPiece(),
			config: makeConfig(),
			outDir: '/out',
			pieces,
			assetKeyToPath: assetMap,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).toHaveBeenCalledWith('assets/cover.jpg')
		expect(getPalette).toHaveBeenCalledWith(buffer)
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'palette',
				content: JSON.stringify(palette),
				mime_type: 'application/json',
				is_embedded: 1,
			}),
		])
	})

	test('returns empty when piece type has no media fields', async () => {
		const pieces = makePieces()
		const configNoMedia = makeConfig({ pieces: [{ type: 'books', fields: {} }] } as unknown as Partial<Config>)

		const records = await run({
			webPiece: makeWebPiece(),
			config: configNoMedia,
			outDir: '/out',
			pieces,
			assetKeyToPath: assetMap,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).not.toHaveBeenCalled()
		expect(getPalette).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('returns empty when piece type not found in config', async () => {
		const pieces = makePieces()
		const configOther = makeConfig({ pieces: [{ type: 'other', fields: { media: ['cover'] } }] } as unknown as Partial<Config>)

		const records = await run({
			webPiece: makeWebPiece(),
			config: configOther,
			outDir: '/out',
			pieces,
			assetKeyToPath: assetMap,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('returns empty when piece has no media values in frontmatter', async () => {
		const pieces = makePieces()
		const webPiece = makeWebPiece({ json_metadata: '{}' })

		const records = await run({
			webPiece,
			config: makeConfig(),
			outDir: '/out',
			pieces,
			assetKeyToPath: assetMap,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('returns empty when media values do not resolve to assets', async () => {
		const pieces = makePieces()
		const webPiece = makeWebPiece({ json_metadata: JSON.stringify({ cover: 'unknown.jpg' }) })

		const records = await run({
			webPiece,
			config: makeConfig(),
			outDir: '/out',
			pieces,
			assetKeyToPath: assetMap,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('falls through to second media field when first has no resolved asset', async () => {
		const pieces = makePieces()
		const palette = { accent: '#000' }
		vi.mocked(getPalette).mockResolvedValue(palette)

		const config = makeConfig({
			pieces: [{ type: 'books', fields: { media: ['poster', 'cover'] } }],
		} as unknown as Partial<Config>)

		const records = await run({
			webPiece: makeWebPiece(),
			config,
			outDir: '/out',
			pieces,
			assetKeyToPath: assetMap,
			logger: makeLogger(),
		})

		expect(pieces.getPieceAsset).toHaveBeenCalledWith('assets/cover.jpg')
		expect(records).toHaveLength(1)
	})

	test('throws when getPalette throws', async () => {
		const pieces = makePieces()
		vi.mocked(getPalette).mockRejectedValue(new Error('palette failed'))

		await expect(
			run({
				webPiece: makeWebPiece(),
				config: makeConfig(),
				outDir: '/out',
				pieces,
				assetKeyToPath: assetMap,
				logger: makeLogger(),
			})
		).rejects.toThrow('palette failed')
	})
})
