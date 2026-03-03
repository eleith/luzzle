import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './attachment.js'
import { mkdir, writeFile } from 'fs/promises'
import { getAssetPath, getAssetDir, type Config, type WebPieces } from '@luzzle/web.utils'
import { Pieces } from '@luzzle/core'

vi.mock('fs/promises')
vi.mock('@luzzle/web.utils')
vi.mock('@luzzle/web.utils/server')

const mocks = {
	mkdir: vi.mocked(mkdir),
	writeFile: vi.mocked(writeFile),
	getAssetPath: vi.mocked(getAssetPath),
	getAssetDir: vi.mocked(getAssetDir),
}

const makeWebPiece = (json_metadata: string): WebPieces => ({
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
		assets: { salt: 'test-salt' },
	}) as unknown as Config

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/attachment', () => {
	test('does nothing when piece type has no attachments config', async () => {
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces

		const records = await run({
			webPiece: makeWebPiece('{}'),
			config: makeConfig(),
			outDir: '/out',
			pieces: mockPieces,
		})

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		expect(mocks.writeFile).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('copies attachment files and returns asset records', async () => {
		const mockPieces = {
			getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('file_content')),
		} as unknown as Pieces

		mocks.getAssetDir.mockReturnValue('books/key123')
		mocks.getAssetPath.mockReturnValue('books/key123/doc.pdf')

		const records = await run({
			webPiece: makeWebPiece('{"doc": "doc.pdf"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
		})

		expect(mocks.mkdir).toHaveBeenCalledWith('/out/books/key123', { recursive: true })
		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('doc.pdf')
		expect(mocks.writeFile).toHaveBeenCalledWith('/out/books/key123/doc.pdf', Buffer.from('file_content'))
		expect(records).toEqual([
			expect.objectContaining({
				piece_asset_path: 'doc.pdf',
				transformation: 'attachment.original',
				asset_path: 'books/key123/doc.pdf',
			}),
		])
	})

	test('handles errors during copy gracefully', async () => {
		const mockPieces = {
			getPieceAsset: vi.fn().mockRejectedValue(new Error('storage error')),
		} as unknown as Pieces
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		mocks.getAssetDir.mockReturnValue('books/key123')
		mocks.getAssetPath.mockReturnValue('books/key123/doc.pdf')

		const records = await run({
			webPiece: makeWebPiece('{"doc": "doc.pdf"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
		})

		expect(consoleErrorSpy).toHaveBeenCalledOnce()
		expect(records).toEqual([])
		consoleErrorSpy.mockRestore()
	})

	test('does nothing for piece type not in config', async () => {
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces
		const config = makeConfig(['doc'])
		const webPiece = { ...makeWebPiece('{"doc": "doc.pdf"}'), type: 'unknown' }

		const records = await run({ webPiece, config, outDir: '/out', pieces: mockPieces })

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})
})
