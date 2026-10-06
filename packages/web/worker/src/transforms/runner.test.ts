import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { runTransformsForPiece, produceTransformsForPiece, persistTransforms } from './runner.js'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../services/db.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { makeLogger } from '../../test/logger.js'
import type { Kysely } from 'kysely'
import type { WebDatabase } from '../services/db.js'
import type { Pieces } from '@luzzle/core'
import type { Logger } from '../services/logger.js'
import { generateAssetKey } from '../assets/key.js'
import { getTransforms } from './index.js'

vi.mock('../assets/key.js')
vi.mock('./index.js')

const transforms = {
	attachment: { run: vi.fn() },
	palette: { run: vi.fn() },
	opengraph: { run: vi.fn(), cleanup: vi.fn() },
}

const mocks = {
	generateAssetKey: vi.mocked(generateAssetKey),
	getTransforms: vi.mocked(getTransforms),
}

const config = {
	paths: { database: 'db.sqlite' },
	assets: { salt: 'test-salt' },
} as unknown as Config

const webPiece = {
	id: '1',
	type: 'books',
	file_path: 'book.md',
	slug: 'my-book',
	key: 'key123',
	title: 'My Book',
	date_added: 100,
	json_metadata: '{}',
} as WebPieces

let db: Kysely<WebDatabase>
let logger: Logger

beforeEach(async () => {
	db = await setupDatabase()
	await db.insertInto('web_pieces').values(webPiece).execute()
	logger = makeLogger()

	mocks.generateAssetKey.mockReturnValue('asset-key')
	mocks.getTransforms.mockReturnValue(
		new Map([
			['attachment', transforms.attachment],
			['palette', transforms.palette],
			['opengraph', transforms.opengraph],
		])
	)
	transforms.attachment.run.mockResolvedValue([])
	transforms.palette.run.mockResolvedValue([])
	transforms.opengraph.run.mockResolvedValue([])
})

afterEach(async () => {
	await teardownDatabase(db)
	vi.clearAllMocks()
})

describe('transforms/runner', () => {
	test('runs all transforms and writes to DB by default', async () => {
		transforms.attachment.run.mockResolvedValueOnce([
			{
				transformation: 'attachment.original',
				asset_path: 'books/key/file.pdf',
				mime_type: 'application/pdf',
			},
		])

		await runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, {}, new Map(), logger)

		const assets = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(assets).toHaveLength(1)
		expect(assets[0]).toMatchObject({
			transformation: 'attachment.original',
			asset_path: 'books/key/file.pdf',
			mime_type: 'application/pdf',
			piece_file_path: 'book.md',
			piece_key: 'key123',
			asset_key: 'asset-key',
		})
		expect(transforms.attachment.run).toHaveBeenCalledOnce()
		expect(transforms.palette.run).toHaveBeenCalledOnce()
		expect(transforms.opengraph.run).toHaveBeenCalledOnce()
	})

	test('filters to only the specified transform when typeFilter is given', async () => {
		await runTransformsForPiece(
			db,
			webPiece,
			config,
			'/out',
			{} as Pieces,
			{ typeFilter: 'palette' },
			new Map(),
			logger
		)

		expect(transforms.palette.run).toHaveBeenCalledOnce()
		expect(transforms.attachment.run).not.toHaveBeenCalled()
		expect(transforms.opengraph.run).not.toHaveBeenCalled()
	})

	test('skips DB delete and insert when dryRun is true', async () => {
		transforms.attachment.run.mockResolvedValueOnce([
			{
				transformation: 'attachment.original',
				asset_path: 'books/key/file.pdf',
				mime_type: 'application/pdf',
			},
		])

		await runTransformsForPiece(
			db,
			webPiece,
			config,
			'/out',
			{} as Pieces,
			{ dryRun: true },
			new Map(),
			logger
		)

		expect(transforms.attachment.run).toHaveBeenCalledOnce()
		const assets = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(assets).toHaveLength(0)
	})

	test('does not insert when transform returns empty records', async () => {
		await runTransformsForPiece(
			db,
			webPiece,
			config,
			'/out',
			{} as Pieces,
			{ typeFilter: 'palette' },
			new Map(),
			logger
		)

		const assets = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(assets).toHaveLength(0)
	})

	test('logs generated asset path', async () => {
		transforms.palette.run.mockResolvedValueOnce([
			{
				transformation: 'palette',
				asset_path: null as unknown as string,
				mime_type: 'application/json',
				content: '{}',
				is_embedded: 1 as const,
			},
		])

		await runTransformsForPiece(
			db,
			webPiece,
			config,
			'/out',
			{} as Pieces,
			{ typeFilter: 'palette' },
			new Map(),
			logger
		)

		expect(logger.info).toHaveBeenCalledWith(
			'transform.palette generated content of application/json'
		)
	})

	test('logs and propagates a transform failure instead of producing empty records', async () => {
		transforms.attachment.run.mockRejectedValueOnce(new Error('boom'))

		await expect(
			runTransformsForPiece(
				db,
				webPiece,
				config,
				'/out',
				{} as Pieces,
				{ typeFilter: 'attachment' },
				new Map(),
				logger
			)
		).rejects.toThrow('boom')

		expect(logger.error).toHaveBeenCalledWith(
			'transform.attachment error for book.md',
			expect.objectContaining({ error: 'boom' })
		)
	})

	test('retains existing asset rows when a later transform fails after earlier production succeeds', async () => {
		const oldRecords = [
			{
				piece_file_path: webPiece.file_path,
				piece_key: webPiece.key,
				asset_key: 'old-attachment',
				transformation: 'attachment',
				asset_path: 'old.pdf',
				mime_type: 'application/pdf',
			},
			{
				piece_file_path: webPiece.file_path,
				piece_key: webPiece.key,
				asset_key: 'old-palette',
				transformation: 'palette',
				content: 'old palette',
				mime_type: 'application/json',
			},
		]
		await db.insertInto('web_pieces_assets').values(oldRecords).execute()
		transforms.attachment.run.mockResolvedValueOnce([
			{ transformation: 'attachment', asset_path: 'new.pdf', mime_type: 'application/pdf' },
		])
		transforms.palette.run.mockRejectedValueOnce(new Error('palette failed'))

		await expect(
			runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, {}, new Map(), logger)
		).rejects.toThrow('palette failed')
		const assets = await db
			.selectFrom('web_pieces_assets')
			.selectAll()
			.orderBy('asset_key')
			.execute()
		expect(assets).toMatchObject(oldRecords)
		expect(transforms.opengraph.run).not.toHaveBeenCalled()
	})

	test('does nothing when typeFilter matches no transform', async () => {
		await runTransformsForPiece(
			db,
			webPiece,
			config,
			'/out',
			{} as Pieces,
			{ typeFilter: 'nonexistent' },
			new Map(),
			logger
		)

		const assets = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(assets).toHaveLength(0)
		expect(transforms.attachment.run).not.toHaveBeenCalled()
	})
})

describe('transforms/produceTransformsForPiece', () => {
	test('returns produced records without touching the DB', async () => {
		const record = {
			transformation: 'palette',
			asset_path: null as unknown as string,
			mime_type: 'application/json',
			content: '{}',
			is_embedded: 1 as const,
		}
		transforms.palette.run.mockResolvedValueOnce([record])

		const produced = await produceTransformsForPiece(
			webPiece,
			config,
			'/out',
			{} as Pieces,
			{ typeFilter: 'palette' },
			new Map(),
			logger
		)

		expect(produced).toEqual([{ name: 'palette', records: [record] }])
		const assets = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(assets).toHaveLength(0)
	})

	test('rejects failed production without returning a successful result or running later transforms', async () => {
		const error = new Error('boom')
		transforms.attachment.run.mockRejectedValueOnce(error)

		await expect(
			produceTransformsForPiece(webPiece, config, '/out', {} as Pieces, {}, new Map(), logger)
		).rejects.toBe(error)
		expect(transforms.palette.run).not.toHaveBeenCalled()
		expect(transforms.opengraph.run).not.toHaveBeenCalled()
		expect(logger.error).toHaveBeenCalledWith(
			'transform.attachment error for book.md',
			expect.objectContaining({ error: 'boom' })
		)
	})
})

describe('transforms/persistTransforms', () => {
	test('writes records and clears prior rows for each transform', async () => {
		await db
			.insertInto('web_pieces_assets')
			.values({
				piece_file_path: 'book.md',
				piece_key: 'key123',
				asset_key: 'old',
				transformation: 'palette',
				asset_path: null,
				mime_type: 'application/json',
				content: 'stale',
				is_embedded: 1,
				piece_asset_path: null,
				piece_field_path: null,
			})
			.execute()

		await persistTransforms(db, webPiece, config, [
			{
				name: 'palette',
				records: [
					{
						transformation: 'palette',
						asset_path: null as unknown as string,
						mime_type: 'application/json',
						content: 'fresh',
						is_embedded: 1 as const,
					},
				],
			},
		])

		const assets = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(assets).toHaveLength(1)
		expect(assets[0]).toMatchObject({ content: 'fresh', asset_key: 'asset-key' })
	})

	test('still clears prior records after successful production of an empty result', async () => {
		await db
			.insertInto('web_pieces_assets')
			.values({
				piece_file_path: 'book.md',
				piece_key: 'key123',
				asset_key: 'old',
				transformation: 'palette',
				asset_path: null,
				mime_type: 'application/json',
				content: 'stale',
				is_embedded: 1,
				piece_asset_path: null,
				piece_field_path: null,
			})
			.execute()

		await persistTransforms(db, webPiece, config, [{ name: 'palette', records: [] }])

		const assets = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(assets).toHaveLength(0)
	})
})
