import type * as Core from '@luzzle/core'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
	Piece,
	type LuzzleStorage,
	type PieceFrontmatterSchema,
	savePieceAsset,
	setFrontmatterValue,
	type PieceFrontmatterSchemaField,
	type PieceMarkdown,
	type PieceFrontmatter
} from '@luzzle/core'
import { getPieces } from '$lib/server/pieces'
import { getStorage } from '$lib/server/storage'
import { actions, load } from './+page.server'
import { config } from '$lib/server/config'

vi.mock('$lib/server/pieces', () => ({ getPieces: vi.fn(), getWebPiece: vi.fn() }))
vi.mock('$lib/server/storage', () => ({ getStorage: vi.fn() }))
vi.mock('$lib/server/database', () => ({ db: {} }))
vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture')
	return { config: makeConfig() }
})
vi.mock('@luzzle/core', async (importOriginal) => ({
	...(await importOriginal<typeof Core>()),
	savePieceAsset: vi.fn()
}))

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => {
	vi.resetAllMocks()
	vi.restoreAllMocks()
})

function setup(content: string, fields: PieceFrontmatterSchemaField[] = []) {
	const storage = { delete: vi.fn() }
	vi.mocked(getStorage).mockReturnValue(storage as unknown as ReturnType<typeof getStorage>)
	const piece = {
		type: 'books',
		fields,
		write: vi.fn().mockResolvedValue(undefined),
		setField: vi.fn(
			async (markdown: PieceMarkdown<PieceFrontmatter>, field: string, value: string) => {
				const updated = structuredClone(markdown)
				setFrontmatterValue(updated.frontmatter, field, value)
				return updated
			}
		)
	}
	vi.mocked(getPieces).mockReturnValue({
		parseFilename: vi.fn().mockReturnValue({ type: 'books' }),
		getPiece: vi.fn().mockResolvedValue(piece)
	} as unknown as ReturnType<typeof getPieces>)
	const formData = new FormData()
	formData.set('content', content)
	const event = {
		params: { path: 'books/example.books.md' },
		request: { formData: async () => formData }
	} as unknown as Parameters<typeof actions.save>[0]
	return { piece, storage, event }
}

const assets: PieceFrontmatterSchemaField[] = [
	{ name: 'cover', type: 'string', format: 'asset' },
	{ name: 'images', type: 'array', items: { type: 'string', format: 'asset' } },
	{
		name: 'editions',
		type: 'array',
		items: { type: 'object', properties: { cover: { type: 'string', format: 'asset' } } }
	}
]

test('Save normalizes line endings and markdown and overwrites the existing piece', async () => {
	const { piece, event } = setup(
		'---\r\ntitle: Reviewed\r\n---\r\n# Heading\r\n\r\nA   paragraph.\r\n'
	)
	expect(await actions.save(event)).toEqual({ success: true })
	expect(piece.write).toHaveBeenCalledExactlyOnceWith({
		filePath: 'books/example.books.md',
		piece: 'books',
		frontmatter: { title: 'Reviewed' },
		note: '# Heading\n\nA paragraph.\n'
	})
	expect(savePieceAsset).not.toHaveBeenCalled()
})

test('Save resolves scalar, array and nested asset URLs while preserving local references', async () => {
	const { piece, storage, event } = setup(
		`---
title: Reviewed
cover: https://example.test/cover.png
images:
  - .assets/local.png
  - https://example.test/image.png
editions:
  - cover: https://example.test/edition.png
---
Body`,
		assets
	)
	vi.mocked(savePieceAsset)
		.mockResolvedValueOnce('.assets/cover.png')
		.mockResolvedValueOnce('.assets/images.png')
		.mockResolvedValueOnce('.assets/edition.png')
	expect(await actions.save(event)).toEqual({ success: true })
	expect(vi.mocked(savePieceAsset).mock.calls).toEqual([
		['books/example.books.md', 'https://example.test/cover.png', storage, { name: 'cover' }],
		['books/example.books.md', 'https://example.test/image.png', storage, { name: 'images' }],
		['books/example.books.md', 'https://example.test/edition.png', storage, { name: 'cover' }]
	])
	expect(piece.write).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({
			frontmatter: {
				title: 'Reviewed',
				cover: '.assets/cover.png',
				images: ['.assets/local.png', '.assets/images.png'],
				editions: [{ cover: '.assets/edition.png' }]
			}
		})
	)
})

test('Save returns the exact raw draft on malformed frontmatter without writing', async () => {
	const rawContent = '---\r\ntitle: [broken\r\n---\r\n untouched  '
	const { piece, event } = setup(rawContent)
	expect(await actions.save(event)).toMatchObject({
		status: 400,
		data: { rawContent, error: { message: expect.stringContaining('failed to save raw piece:') } }
	})
	expect(piece.write).not.toHaveBeenCalled()
})

test('Save preserves the exact draft and stops on a failed URL download', async () => {
	const rawContent =
		'---\r\ncover: https://example.test/cover.png\r\nimages: [https://example.test/image.png]\r\n---\r\n untouched  '
	const { piece, storage, event } = setup(rawContent, assets)
	vi.mocked(savePieceAsset)
		.mockResolvedValueOnce('.assets/cover.png')
		.mockRejectedValueOnce(new Error('download failed'))
	expect(await actions.save(event)).toMatchObject({
		status: 400,
		data: {
			rawContent,
			fields: undefined,
			note: undefined,
			error: {
				message:
					"Failed to download URL for 'images.0' (download failed). Remove the URL and use the form editor to upload the file instead."
			}
		}
	})
	expect(piece.write).not.toHaveBeenCalled()
	expect(storage.delete).not.toHaveBeenCalled()
})

test('Save returns the exact draft on write failure and does not delete downloaded assets', async () => {
	const rawContent = '---\r\ncover: https://example.test/cover.png\r\n---\r\n untouched  '
	const { piece, storage, event } = setup(rawContent, assets)
	vi.mocked(savePieceAsset).mockResolvedValueOnce('.assets/cover.png')
	piece.write.mockRejectedValueOnce(new Error('invalid metadata'))
	expect(await actions.save(event)).toMatchObject({
		status: 400,
		data: {
			rawContent,
			fields: undefined,
			note: undefined,
			error: { message: 'failed to save raw piece: invalid metadata' }
		}
	})
	expect(piece.write).toHaveBeenCalledTimes(1)
	expect(storage.delete).not.toHaveBeenCalled()
})

test.each(['https://example.test/cover.png', 'HTTPS://example.test/cover.png'])(
	'Save converts %s to a local asset before strict validation and writing',
	async (url) => {
		const { storage, event } = setup(`---\ntitle: Reviewed\ncover: ${url}\n---\n`)
		const targetStorage = {
			...storage,
			makeDirectory: vi.fn(),
			writeFile: vi.fn()
		}
		const schema = {
			title: 'books',
			type: 'object',
			properties: { title: { type: 'string' }, cover: { type: 'string', format: 'asset' } },
			required: ['title', 'cover'],
			additionalProperties: false
		} as PieceFrontmatterSchema<PieceFrontmatter>
		const piece = new Piece('books', targetStorage as unknown as LuzzleStorage, schema)
		vi.spyOn(getPieces(), 'getPiece').mockResolvedValue(piece)
		vi.mocked(savePieceAsset).mockResolvedValue('.assets/books/example.books/cover.png')

		expect(await actions.save(event)).toEqual({ success: true })
		expect(savePieceAsset).toHaveBeenCalledExactlyOnceWith('books/example.books.md', url, storage, {
			name: 'cover'
		})
		expect(targetStorage.writeFile).toHaveBeenCalledExactlyOnceWith(
			'books/example.books.md',
			expect.stringContaining('cover: .assets/books/example.books/cover.png')
		)
	}
)

test.each([false, true])(
	'source loader exposes only generation availability (configured: %s)',
	async (configured) => {
		config.ai = configured ? { provider: 'google', api_key: 'private-ai-key' } : undefined
		const { piece, storage } = setup('')
		Object.assign(piece, {
			get: vi.fn().mockResolvedValue({ filePath: 'books/example.books.md' }),
			schema: { type: 'object', properties: {} }
		})
		Object.assign(storage, {
			readFile: vi.fn().mockResolvedValue('Unsaved source'),
			stat: vi.fn().mockResolvedValue({ last_modified: new Date(0) })
		})
		const result = await load({ params: { path: 'books/example.books.md' } } as Parameters<
			typeof load
		>[0])
		expect(result).toEqual({
			file: 'books/example.books.md',
			type: 'books',
			rawContent: 'Unsaved source',
			schema: { type: 'object', properties: {} },
			canGenerate: configured,
			assetFields: [],
			publishedAt: null,
			fileUpdatedAt: 0
		})
	}
)
