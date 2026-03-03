import { describe, test, expect, vi, afterEach } from 'vitest'
import { runTransformsForPiece } from './runner.js'
import { type Config, type WebPieces } from '@luzzle/web.utils'
import { mockKysely } from '../database.mock.js'
import { Pieces } from '@luzzle/core'

vi.mock('./index.js', () => ({
	transforms: new Map([
		['attachment', { run: vi.fn().mockResolvedValue([]), cleanup: undefined }],
		['palette', { run: vi.fn().mockResolvedValue([]), cleanup: undefined }],
		['opengraph', { run: vi.fn().mockResolvedValue([]), cleanup: vi.fn().mockResolvedValue(undefined) }],
	]),
}))

vi.mock('@luzzle/core')

import { transforms } from './index.js'

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

afterEach(() => {
	vi.clearAllMocks()
})

describe('lib/transforms/runner', () => {
	test('runs all transforms and writes to DB by default', async () => {
		const { db, queries } = mockKysely()
		vi.mocked(transforms.get('attachment')!.run).mockResolvedValueOnce([
			{ transformation: 'attachment.original', asset_path: 'books/key/file.pdf', mime_type: 'application/pdf' },
		])

		await runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, {})

		expect(db.deleteFrom).toHaveBeenCalledWith('web_pieces_assets')
		expect(db.insertInto).toHaveBeenCalledWith('web_pieces_assets')
		expect(transforms.get('attachment')!.run).toHaveBeenCalledOnce()
		expect(transforms.get('palette')!.run).toHaveBeenCalledOnce()
		expect(transforms.get('opengraph')!.run).toHaveBeenCalledOnce()
		expect(queries.execute).toHaveBeenCalled()
	})

	test('filters to only the specified transform when typeFilter is given', async () => {
		const { db } = mockKysely()

		await runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, { typeFilter: 'palette' })

		expect(transforms.get('palette')!.run).toHaveBeenCalledOnce()
		expect(transforms.get('attachment')!.run).not.toHaveBeenCalled()
		expect(transforms.get('opengraph')!.run).not.toHaveBeenCalled()
		expect(db.deleteFrom).toHaveBeenCalledWith('web_pieces_assets')
	})

	test('skips DB delete and insert when dryRun is true', async () => {
		const { db } = mockKysely()
		vi.mocked(transforms.get('attachment')!.run).mockResolvedValueOnce([
			{ transformation: 'attachment.original', asset_path: 'books/key/file.pdf', mime_type: 'application/pdf' },
		])

		await runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, { dryRun: true })

		expect(transforms.get('attachment')!.run).toHaveBeenCalledOnce()
		expect(db.deleteFrom).not.toHaveBeenCalledWith('web_pieces_assets')
		expect(db.insertInto).not.toHaveBeenCalledWith('web_pieces_assets')
	})

	test('does not insert when transform returns empty records', async () => {
		const { db } = mockKysely()

		await runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, { typeFilter: 'palette' })

		expect(db.deleteFrom).toHaveBeenCalledWith('web_pieces_assets')
		expect(db.insertInto).not.toHaveBeenCalledWith('web_pieces_assets')
	})

	test('logs generated asset path', async () => {
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const { db } = mockKysely()
		vi.mocked(transforms.get('palette')!.run).mockResolvedValueOnce([
			{ transformation: 'palette', asset_path: null as unknown as string, mime_type: 'application/json', content: '{}', is_embedded: 1 as const },
		])

		await runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, { typeFilter: 'palette' })

		expect(consoleLogSpy).toHaveBeenCalledWith('[transform.palette] generated content of application/json')
		consoleLogSpy.mockRestore()
	})

	test('logs error and continues when transform throws', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { db } = mockKysely()
		vi.mocked(transforms.get('attachment')!.run).mockRejectedValueOnce(new Error('boom'))

		await expect(
			runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, { typeFilter: 'attachment' })
		).resolves.not.toThrow()

		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[transform.attachment] error for book.md'))
		consoleErrorSpy.mockRestore()
	})

	test('does nothing when typeFilter matches no transform', async () => {
		const { db } = mockKysely()

		await runTransformsForPiece(db, webPiece, config, '/out', {} as Pieces, { typeFilter: 'nonexistent' })

		expect(db.deleteFrom).not.toHaveBeenCalled()
		expect(transforms.get('attachment')!.run).not.toHaveBeenCalled()
	})
})
