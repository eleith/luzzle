import { describe, test, expect, vi, afterEach } from 'vitest'
import { mkdir, writeFile } from 'fs/promises'
import type { Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import { run } from './attachment.js'
import type { WebPieces } from '../services/db.js'
import { makeLogger } from '../../test/logger.js'

vi.mock('fs/promises')

const emptyMap = new Map<string, string>()

const mocks = {
	mkdir: vi.mocked(mkdir),
	writeFile: vi.mocked(writeFile)
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
	title: 'My Book'
})

const makeConfig = (attachments?: string[]): Config =>
	({
		pieces: [
			{
				type: 'books',
				fields: {
					title: 'title',
					date_consumed: 'date_consumed',
					...(attachments ? { attachments } : {})
				}
			}
		],
		assets: { salt: 'test-salt' }
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
			assetKeyToPath: emptyMap,
			logger: makeLogger()
		})

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		expect(mocks.writeFile).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('copies attachment files and returns asset records', async () => {
		const attachment = 'doc.pdf'
		const mockPieces = {
			getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('file_content'))
		} as unknown as Pieces

		const records = await run({
			webPiece: makeWebPiece('{"doc": "key"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: new Map([['key', attachment]]),
			logger: makeLogger()
		})

		expect(mocks.mkdir).toHaveBeenCalledWith('/out/books/key123', { recursive: true })
		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith(attachment)
		expect(mocks.writeFile).toHaveBeenCalledWith(
			'/out/books/key123/doc.pdf',
			Buffer.from('file_content')
		)
		expect(records).toEqual([
			expect.objectContaining({
				piece_asset_path: 'doc.pdf',
				transformation: 'attachment',
				asset_path: 'books/key123/doc.pdf',
				mime_type: 'application/pdf'
			})
		])
	})

	test('defaults to application/octet-stream on unknown file type', async () => {
		const attachment = 'doc.abcxyz'
		const mockPieces = {
			getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('file_content'))
		} as unknown as Pieces

		const records = await run({
			webPiece: makeWebPiece('{"doc": "key"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: new Map([['key', attachment]]),
			logger: makeLogger()
		})

		expect(mocks.writeFile).toHaveBeenCalledWith(
			'/out/books/key123/doc.abcxyz',
			Buffer.from('file_content')
		)
		expect(records).toEqual([
			expect.objectContaining({
				piece_asset_path: 'doc.abcxyz',
				transformation: 'attachment',
				asset_path: 'books/key123/doc.abcxyz',
				mime_type: 'application/octet-stream'
			})
		])
	})

	test('throws on copy error', async () => {
		const attachment = 'doc.pdf'
		const mockPieces = {
			getPieceAsset: vi.fn().mockRejectedValue(new Error('storage error'))
		} as unknown as Pieces

		await expect(
			run({
				webPiece: makeWebPiece('{"doc": "key"}'),
				config: makeConfig(['doc']),
				outDir: '/out',
				pieces: mockPieces,
				assetKeyToPath: new Map<string, string>([['key', attachment]]),
				logger: makeLogger()
			})
		).rejects.toThrow('storage error')
	})

	test('does nothing for piece type not in config', async () => {
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces
		const config = makeConfig(['doc'])
		const webPiece = { ...makeWebPiece('{"doc": "doc.pdf"}'), type: 'unknown' }

		const records = await run({
			webPiece,
			config,
			outDir: '/out',
			pieces: mockPieces,
			assetKeyToPath: emptyMap,
			logger: makeLogger()
		})

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})
})
