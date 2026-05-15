import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './markdown.js'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../../db.js'
import type { Pieces } from '@luzzle/core'
import { makeLogger } from '../../../test/logger.js'

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

const makePieces = (fields: Array<Record<string, unknown>> = []): Pieces =>
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
			logger: makeLogger()
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
			logger: makeLogger()
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
				logger: makeLogger()
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
			logger: makeLogger()
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
			webPiece: makeWebPiece({ note: undefined, json_metadata: null as unknown as string }),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces([{ name: 'description', type: 'string', format: 'markdown' }]),
			assetKeyToPath: emptyMap,
			logger: makeLogger()
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
				logger: makeLogger()
			})
		).rejects.toThrow('500')
	})

	test('renders each item in an array of markdown strings', async () => {
		const html0 = '<section class="markdown"><p>First</p></section>'
		const html1 = '<section class="markdown"><p>Second</p></section>'
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(html0),
			} as unknown as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(html1),
			} as unknown as Response)

		const records = await run({
			webPiece: makeWebPiece({
				note: undefined,
				json_metadata: JSON.stringify({ sections: ['# First', '# Second'] }),
			}),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces([
				{ name: 'sections', type: 'array', items: { type: 'string', format: 'markdown' } },
			]),
			assetKeyToPath: emptyMap,
			logger: makeLogger()
		})

		expect(fetch).toHaveBeenCalledTimes(2)
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/transform/markdown?field=sections.0'
		)
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/transform/markdown?field=sections.1'
		)
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'markdown.sections.0',
				piece_field_path: 'sections.0',
				content: html0,
			}),
			expect.objectContaining({
				transformation: 'markdown.sections.1',
				piece_field_path: 'sections.1',
				content: html1,
			}),
		])
	})

	test('throws on error response for array item', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		} as unknown as Response)

		await expect(
			run({
				webPiece: makeWebPiece({
					note: undefined,
					json_metadata: JSON.stringify({ sections: ['# Fail'] }),
				}),
				config: makeConfig(),
				outDir: '/out',
				pieces: makePieces([
					{ name: 'sections', type: 'array', items: { type: 'string', format: 'markdown' } },
				]),
				assetKeyToPath: emptyMap,
				logger: makeLogger()
			})
		).rejects.toThrow('500')
	})

	test('renders markdown field nested inside an object', async () => {
		const html = '<section class="markdown"><p>nested</p></section>'
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			status: 200,
			text: vi.fn().mockResolvedValue(html),
		} as unknown as Response)

		const records = await run({
			webPiece: makeWebPiece({
				note: undefined,
				json_metadata: JSON.stringify({ meta: { bio: '**nested**' } }),
			}),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces([
				{
					name: 'meta',
					type: 'object',
					properties: {
						bio: { type: 'string', format: 'markdown' },
					},
				},
			]),
			assetKeyToPath: emptyMap,
			logger: makeLogger()
		})

		expect(fetch).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/transform/markdown?field=meta.bio'
		)
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'markdown.meta.bio',
				piece_field_path: 'meta.bio',
				content: html,
			}),
		])
	})

	test('renders markdown fields inside array of objects', async () => {
		const html0 = '<section class="markdown"><p>first body</p></section>'
		const html1 = '<section class="markdown"><p>second body</p></section>'
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(html0),
			} as unknown as Response)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue(html1),
			} as unknown as Response)

		const records = await run({
			webPiece: makeWebPiece({
				note: undefined,
				json_metadata: JSON.stringify({
					chapters: [{ body: '# First' }, { body: '# Second' }],
				}),
			}),
			config: makeConfig(),
			outDir: '/out',
			pieces: makePieces([
				{
					name: 'chapters',
					type: 'array',
					items: {
						type: 'object',
						properties: {
							body: { type: 'string', format: 'markdown' },
						},
					},
				},
			]),
			assetKeyToPath: emptyMap,
			logger: makeLogger()
		})

		expect(fetch).toHaveBeenCalledTimes(2)
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/transform/markdown?field=chapters.0.body'
		)
		expect(fetch).toHaveBeenCalledWith(
			'http://localhost/api/pieces/books/my-book/transform/markdown?field=chapters.1.body'
		)
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'markdown.chapters.0.body',
				piece_field_path: 'chapters.0.body',
				content: html0,
			}),
			expect.objectContaining({
				transformation: 'markdown.chapters.1.body',
				piece_field_path: 'chapters.1.body',
				content: html1,
			}),
		])
	})
})
