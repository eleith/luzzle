import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './attachment.js'
import { mockKysely } from '../database.mock.js'
import { mkdir, writeFile } from 'fs/promises'
import { getAssetPath, getAssetDir, type Config } from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { Pieces } from '@luzzle/core'
import type { LuzzleSelectable } from '@luzzle/core'

vi.mock('fs/promises')
vi.mock('@luzzle/web.utils')
vi.mock('@luzzle/web.utils/server')

const mocks = {
	mkdir: vi.mocked(mkdir),
	writeFile: vi.mocked(writeFile),
	getAssetPath: vi.mocked(getAssetPath),
	getAssetDir: vi.mocked(getAssetDir),
	generateAssetKey: vi.mocked(generateAssetKey),
}

const makeItem = (frontmatter_json: string): LuzzleSelectable<'pieces_items'> => ({
	id: '1',
	type: 'books',
	date_updated: 100,
	date_added: 50,
	frontmatter_json,
	file_path: 'book.md',
	note_markdown: '',
	assets_json_array: '[]',
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
		const { db } = mockKysely()
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces
		mocks.generateAssetKey.mockReturnValue('key')

		await run({
			item: makeItem('{}'),
			config: makeConfig(),
			outDir: '/out',
			pieces: mockPieces,
			db,
		})

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		expect(mocks.writeFile).not.toHaveBeenCalled()
	})

	test('copies attachment files and records in DB', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = {
			getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('file_content')),
		} as unknown as Pieces

		mocks.generateAssetKey.mockReturnValue('key123')
		mocks.getAssetDir.mockReturnValue('books/key123')
		mocks.getAssetPath.mockReturnValue('books/key123/doc.pdf')
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		await run({
			item: makeItem('{"doc": "doc.pdf"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
			db,
		})

		expect(mocks.mkdir).toHaveBeenCalledWith('/out/books/key123', { recursive: true })
		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('doc.pdf')
		expect(mocks.writeFile).toHaveBeenCalledWith('/out/books/key123/doc.pdf', Buffer.from('file_content'))
		expect(db.deleteFrom).toHaveBeenCalledWith('web_pieces_assets')
		expect(db.insertInto).toHaveBeenCalledWith('web_pieces_assets')
		expect(queries.values).toHaveBeenCalledWith(
			expect.objectContaining({
				piece_file_path: 'book.md',
				piece_key: 'key123',
				piece_asset_path: 'doc.pdf',
				transformation: 'attachment.original',
				asset_path: 'books/key123/doc.pdf',
			})
		)
	})

	test('handles errors during copy gracefully', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = {
			getPieceAsset: vi.fn().mockRejectedValue(new Error('storage error')),
		} as unknown as Pieces
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		mocks.generateAssetKey.mockReturnValue('key')
		mocks.getAssetDir.mockReturnValue('books/key')
		mocks.getAssetPath.mockReturnValue('books/key/doc.pdf')
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		await run({
			item: makeItem('{"doc": "doc.pdf"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
			db,
		})

		expect(consoleErrorSpy).toHaveBeenCalledOnce()
		expect(db.insertInto).not.toHaveBeenCalled()
		consoleErrorSpy.mockRestore()
	})

	test('does nothing for piece type not in config', async () => {
		const { db } = mockKysely()
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces

		const config = makeConfig(['doc'])
		const item = { ...makeItem('{"doc": "doc.pdf"}'), type: 'unknown' }

		await run({ item, config, outDir: '/out', pieces: mockPieces, db })

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
	})
})
