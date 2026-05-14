import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { runTransformsForPiece } from './runner.js'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../db.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import type { Kysely } from 'kysely'
import type { WebDatabase } from '../db.js'
import type { Pieces } from '@luzzle/core'
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

beforeEach(async () => {
	db = await setupDatabase()
	await db.insertInto('web_pieces').values(webPiece).execute()

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

		await runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, {}, new Map())

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
			new Map()
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
			new Map()
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
			new Map()
		)

		const assets = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(assets).toHaveLength(0)
	})

	test('logs generated asset path', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
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
			new Map()
		)

		expect(consoleLogSpy).toHaveBeenCalledWith(
			'[transform.palette] generated content of application/json'
		)
		consoleLogSpy.mockRestore()
	})

	test('logs error and continues when transform throws', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		transforms.attachment.run.mockRejectedValueOnce(new Error('boom'))

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

		const assets = await db.selectFrom('web_pieces_assets').selectAll().execute()
		expect(assets).toHaveLength(0)
		expect(transforms.attachment.run).not.toHaveBeenCalled()
	})
})
