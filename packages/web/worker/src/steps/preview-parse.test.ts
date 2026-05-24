import { describe, test, expect, vi, beforeEach } from 'vitest'
import { previewParseStep } from './preview-parse.js'
import { generateAssetKey } from '../assets/key.js'
import type { Pieces, PieceFrontmatterProperty } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { WorkerContext } from '../services/context.js'

vi.mock('../assets/key.js')

const mocks = {
	generateAssetKey: vi.mocked(generateAssetKey),
}

function makeCtx(): WorkerContext {
	return {
		config: {
			assets: { salt: 'test-salt' },
			pieces: [{ type: 'books', fields: { title: 'title', date_consumed: 'date_read', summary: 'description', tags: 'keywords' } }]
		} as unknown as Config,
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		},
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

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
		parseFilename:
			overrides?.parseFilename ?? vi.fn().mockReturnValue({ type: 'books', slug: 'my-book' }),
		getPiece: overrides?.getPiece ?? vi.fn().mockResolvedValue(piece),
	} as unknown as Pieces
}

describe('previewParseStep', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.generateAssetKey.mockImplementation((p) => `key:${p}`)
	})

	test('replaces asset paths with keys and builds maps', async () => {
		const pieces = makePieces()
		const result = await previewParseStep.run(
			{ filePath: 'books/my-book.books.md', pieces },
			makeCtx()
		)
		expect(result.status).toBe('completed')
		if (result.status !== 'completed') return

		const parsed = result.value
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

	test('throws if filename has no type', async () => {
		const pieces = makePieces({ parseFilename: vi.fn().mockReturnValue({}) })
		await expect(
			previewParseStep.run({ filePath: 'weird.md', pieces }, makeCtx())
		).rejects.toThrow(/unknown piece type/)
	})
})
