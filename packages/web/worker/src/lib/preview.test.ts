import { describe, test, expect, vi, beforeEach } from 'vitest'
import { parsePreview, runPreviewTransform } from './preview.js'
import { generateAssetKey } from '../assets/key.js'
import { getTransforms } from '../transforms/index.js'
import type { Pieces, PieceFrontmatterProperty } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { Logger } from '../logger.js'

vi.mock('../assets/key.js')
vi.mock('../transforms/index.js')

const mocks = {
	generateAssetKey: vi.mocked(generateAssetKey),
	getTransforms: vi.mocked(getTransforms),
}

const config = {
	assets: { salt: 'test-salt' },
} as unknown as Config

function makePieces(overrides?: Partial<{
	parseFilename: ReturnType<typeof vi.fn>
	getPiece: ReturnType<typeof vi.fn>
}>): Pieces {
	const pieceFields: PieceFrontmatterProperty[] = [
		{ name: 'title', type: 'string' } as unknown as PieceFrontmatterProperty,
		{ name: 'cover', type: 'string', format: 'asset' } as unknown as PieceFrontmatterProperty,
	]
	const piece = {
		fields: pieceFields,
		get: vi.fn().mockResolvedValue({
			frontmatter: { title: 'Hello', cover: 'images/foo.jpg' },
			note: 'a note',
		}),
	}
	return {
		parseFilename: overrides?.parseFilename ?? vi.fn().mockReturnValue({ type: 'books', slug: 'my-book' }),
		getPiece: overrides?.getPiece ?? vi.fn().mockResolvedValue(piece),
	} as unknown as Pieces
}

const logger: Logger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}

describe('lib/preview', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.generateAssetKey.mockImplementation((p) => `key:${p}`)
	})

	test('parsePreview replaces asset paths with keys and builds maps', async () => {
		const pieces = makePieces()
		const parsed = await parsePreview('books/my-book.books.md', config, pieces)

		expect(parsed.type).toBe('books')
		expect(parsed.slug).toBe('my-book')
		expect(parsed.pathToKey.get('images/foo.jpg')).toBe('key:images/foo.jpg')
		expect(parsed.keyToPath.get('key:images/foo.jpg')).toBe('images/foo.jpg')
		expect(parsed.sanitizedFrontmatter.cover).toBe('key:images/foo.jpg')
		expect(parsed.note).toBe('a note')
		expect(JSON.parse(parsed.webPiece.json_metadata).cover).toBe('key:images/foo.jpg')
		expect(parsed.webPiece.file_path).toBe('books/my-book.books.md')
		expect(parsed.webPiece.type).toBe('books')
	})

	test('parsePreview throws if filename has no type', async () => {
		const pieces = makePieces({ parseFilename: vi.fn().mockReturnValue({}) })
		await expect(parsePreview('weird.md', config, pieces)).rejects.toThrow(/unknown piece type/)
	})

	test('runPreviewTransform delegates to the named transform with keyToPath', async () => {
		const palette = { run: vi.fn().mockResolvedValue([{ transformation: 'palette' }]) }
		mocks.getTransforms.mockReturnValue(new Map([['palette', palette]]))

		const pieces = makePieces()
		const parsed = await parsePreview('books/my-book.books.md', config, pieces)

		const records = await runPreviewTransform('palette', parsed, config, pieces, logger)

		expect(palette.run).toHaveBeenCalledWith(
			expect.objectContaining({
				webPiece: parsed.webPiece,
				assetKeyToPath: parsed.keyToPath,
			})
		)
		expect(records).toEqual([{ transformation: 'palette' }])
	})

	test('runPreviewTransform returns empty when the transform is not registered', async () => {
		mocks.getTransforms.mockReturnValue(new Map())
		const pieces = makePieces()
		const parsed = await parsePreview('books/my-book.books.md', config, pieces)
		const records = await runPreviewTransform('markdown', parsed, config, pieces, logger)
		expect(records).toEqual([])
	})
})
