import { describe, test, expect, vi, afterEach, beforeEach, beforeAll } from 'vitest'
import { runTransformsForPiece } from './runner.js'
import { type Config, type WebPieces } from '@luzzle/web.utils'
import { setupTestDb, withWebTables, beginTransaction, rollbackTransaction } from '../../../test/db.js'
import { LuzzleDatabase, Pieces } from '@luzzle/core'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { transforms } from './index.js'

vi.mock('@luzzle/web.utils/server')
vi.mock('./index.js', () => ({
	transforms: new Map([
		['attachment', { run: vi.fn(), cleanup: undefined }],
		['palette', { run: vi.fn(), cleanup: undefined }],
		['opengraph', { run: vi.fn(), cleanup: vi.fn() }],
	]),
}))

const mocks = {
	generateAssetKey: vi.mocked(generateAssetKey),
	attachment: vi.mocked(transforms.get('attachment')!.run),
	palette: vi.mocked(transforms.get('palette')!.run),
	opengraph: vi.mocked(transforms.get('opengraph')!.run),
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
} as WebPieces

let db: LuzzleDatabase

beforeAll(async () => {
	db = await setupTestDb()
})

beforeEach(async () => {
	await beginTransaction(db)
	await withWebTables(db).insertInto('web_pieces').values(webPiece).execute()

	mocks.generateAssetKey.mockReturnValue('asset-key')
	mocks.attachment.mockResolvedValue([])
	mocks.palette.mockResolvedValue([])
	mocks.opengraph.mockResolvedValue([])
})

afterEach(async () => {
	await rollbackTransaction(db)
	vi.clearAllMocks()
})

async function getAssets() {
	return withWebTables(db).selectFrom('web_pieces_assets').selectAll().execute()
}

describe('lib/transforms/runner', () => {
	test('runs all transforms and writes to DB by default', async () => {
		mocks.attachment.mockResolvedValueOnce([
			{
				transformation: 'attachment.original',
				asset_path: 'books/key/file.pdf',
				mime_type: 'application/pdf',
			},
		])

		await runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, {}, new Map())

		const assets = await getAssets()
		expect(assets).toHaveLength(1)
		expect(assets[0]).toMatchObject({
			transformation: 'attachment.original',
			asset_path: 'books/key/file.pdf',
			mime_type: 'application/pdf',
			piece_file_path: 'book.md',
			piece_key: 'key123',
			asset_key: 'asset-key',
		})
		expect(mocks.attachment).toHaveBeenCalledOnce()
		expect(mocks.palette).toHaveBeenCalledOnce()
		expect(mocks.opengraph).toHaveBeenCalledOnce()
	})

	test('filters to only the specified transform when typeFilter is given', async () => {
		await runTransformsForPiece(
			db,
			webPiece,
			config,
			'/out',
			{} as Pieces,
			{ typeFilter: 'palette' },
			new Map()
		)

		expect(mocks.palette).toHaveBeenCalledOnce()
		expect(mocks.attachment).not.toHaveBeenCalled()
		expect(mocks.opengraph).not.toHaveBeenCalled()
	})

	test('skips DB delete and insert when dryRun is true', async () => {
		mocks.attachment.mockResolvedValueOnce([
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
			new Map()
		)

		expect(mocks.attachment).toHaveBeenCalledOnce()
		const assets = await getAssets()
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
			new Map()
		)

		const assets = await getAssets()
		expect(assets).toHaveLength(0)
	})

	test('logs generated asset path', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		mocks.palette.mockResolvedValueOnce([
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
			new Map()
		)

		expect(consoleLogSpy).toHaveBeenCalledWith(
			'[transform.palette] generated content of application/json'
		)
		consoleLogSpy.mockRestore()
	})

	test('logs error and continues when transform throws', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		mocks.attachment.mockRejectedValueOnce(new Error('boom'))

		await expect(
			runTransformsForPiece(
				db,
				webPiece,
				config,
				'/out',
				{} as Pieces,
				{ typeFilter: 'attachment' },
				new Map()
			)
		).resolves.not.toThrow()

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('[transform.attachment] error for book.md')
		)
		consoleErrorSpy.mockRestore()
	})

	test('does nothing when typeFilter matches no transform', async () => {
		await runTransformsForPiece(
			db,
			webPiece,
			config,
			'/out',
			{} as Pieces,
			{ typeFilter: 'nonexistent' },
			new Map()
		)

		const assets = await getAssets()
		expect(assets).toHaveLength(0)
		expect(mocks.attachment).not.toHaveBeenCalled()
	})
})
