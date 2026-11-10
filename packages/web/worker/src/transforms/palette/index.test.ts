import { afterEach, expect, test, vi } from 'vitest'
import type { Config } from '@luzzle/web.config'
import type { Pieces } from '@luzzle/core'
import type { WebPieces } from '../../services/db.js'
import { makeLogger } from '../../../test/logger.js'
import { extractSwatches } from './extract.js'
import { run } from './index.js'

vi.mock('./extract.js', () => ({ extractSwatches: vi.fn() }))

afterEach(() => vi.resetAllMocks())

const webPiece = {
	type: 'books',
	json_metadata: JSON.stringify({ poster: 'missing-key', cover: 'cover-key' }),
} as WebPieces
const assetMap = new Map([['cover-key', 'assets/cover.jpg']])
const config = (media = ['poster', 'cover']) =>
	({ pieces: [{ type: 'books', fields: { media } }] }) as unknown as Config
const pieces = (buffer = Buffer.from('image')) =>
	({ getPieceAsset: vi.fn().mockResolvedValue(buffer) }) as unknown as Pieces

test('uses the first resolved media image and stores its palette as embedded JSON', async () => {
	const image = Buffer.from('image-bytes')
	const archive = pieces(image)
	vi.mocked(extractSwatches).mockResolvedValue([
		{ r: 184, g: 89, b: 76, hex: '#b8594c', population: 1 },
	])

	const records = await run({
		webPiece,
		config: config(),
		outDir: '/out',
		pieces: archive,
		assetKeyToPath: assetMap,
		logger: makeLogger(),
	})

	expect(archive.getPieceAsset).toHaveBeenCalledWith('assets/cover.jpg')
	expect(extractSwatches).toHaveBeenCalledWith(image)
	expect(records).toEqual([
		expect.objectContaining({
			transformation: 'palette',
			mime_type: 'application/json',
			is_embedded: 1,
		}),
	])
	expect(JSON.parse(records[0].content!)).toMatchObject({
		background: '#b8594c',
		swatches: ['#b8594c'],
	})
})

test('does not read an image for a piece without configured media', async () => {
	const archive = pieces()

	const records = await run({
		webPiece,
		config: config([]),
		outDir: '/out',
		pieces: archive,
		assetKeyToPath: assetMap,
		logger: makeLogger(),
	})

	expect(records).toEqual([])
	expect(archive.getPieceAsset).not.toHaveBeenCalled()
})

test('does not read an image when no media references resolve to registered assets', async () => {
	const archive = pieces()

	const records = await run({
		webPiece,
		config: config(),
		outDir: '/out',
		pieces: archive,
		assetKeyToPath: new Map(),
		logger: makeLogger(),
	})

	expect(records).toEqual([])
	expect(archive.getPieceAsset).not.toHaveBeenCalled()
})

test('propagates extraction failures to the workflow', async () => {
	vi.mocked(extractSwatches).mockRejectedValue(new Error('invalid image'))

	await expect(
		run({
			webPiece,
			config: config(),
			outDir: '/out',
			pieces: pieces(),
			assetKeyToPath: assetMap,
			logger: makeLogger(),
		})
	).rejects.toThrow('invalid image')
})
