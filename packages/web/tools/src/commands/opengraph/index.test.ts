import { describe, test, vi, afterEach, expect } from 'vitest'
import generateOpenGraphs from './index.js'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { generatePngFromUrl } from '../../lib/utils/png.js'
import { getBrowser } from '../../lib/utils/browser.js'
import { Pieces, StorageFileSystem } from '@luzzle/core'
import { type Config } from '@luzzle/web.utils'
import { getConfig } from '../../lib/config.js'
import { getDatabase } from '../../lib/database.js'
import { mockKysely } from '../../lib/database.mock.js'
import { Browser } from 'puppeteer'

vi.mock('../../lib/lastRun.js')
vi.mock('../../lib/utils/png.js')
vi.mock('../../lib/utils/browser.js')
vi.mock('@luzzle/core')
vi.mock('../../lib/config.js')
vi.mock('../../lib/database.js')

const mocks = {
	getLastRunFor: vi.mocked(getLastRunFor),
	setLastRunFor: vi.mocked(setLastRunFor),
	generatePngFromUrl: vi.mocked(generatePngFromUrl),
	getBrowser: vi.mocked(getBrowser),
	getDatabase: vi.mocked(getDatabase),
	getConfig: vi.mocked(getConfig),
	StorageFileSystem: vi.mocked(StorageFileSystem),
	Pieces: vi.mocked(Pieces),
}

describe('commands/opengraph/index.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
		vi.clearAllMocks()
	})

	test('should generate an opengraph image for a single item', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		const url = 'http://localhost'
		const config = { paths: { database: 'test' }, url: { app: url } } as Config

		mocks.getConfig.mockReturnValue(config)
		mocks.getDatabase.mockReturnValue(db)
		vi.spyOn(queries, 'execute').mockResolvedValue([
			{
				id: '1',
				key: 'aa',
				type: 'test',
				file_path: '/path/to/test.md',
				date_added: new Date(0).toISOString(),
				date_updated: new Date().toISOString(),
			},
		])
		mocks.getLastRunFor.mockResolvedValue(new Date(0))
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)
		mocks.generatePngFromUrl.mockResolvedValue(Buffer.from('test'))

		await generateOpenGraphs(
			{
				outputDir: 'test',
				host: 'test',
			},
			config
		)

		expect(mocks.getDatabase).toHaveBeenCalledOnce()
		expect(mocks.getLastRunFor).toHaveBeenCalledOnce()
		expect(mocks.getBrowser).toHaveBeenCalledOnce()
		expect(mocks.generatePngFromUrl).toHaveBeenCalledWith(
			expect.any(String),
			browser,
			'test/test/aa/opengraph.png'
		)
		expect(db.insertInto).toHaveBeenCalledWith('web_pieces_assets')
		expect(queries.values).toHaveBeenCalledWith(
			expect.objectContaining({
				piece_file_path: '/path/to/test.md',
				piece_key: 'aa',
				transformation: 'opengraph',
				asset_path: 'test/aa/opengraph.png',
				mime_type: 'image/png',
			})
		)
		expect(mocks.setLastRunFor).toHaveBeenCalledOnce()
		expect(browser.close).toHaveBeenCalledOnce()
	})

	test('should not generate if item is not updated', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		const url = 'http://localhost'
		const config = { paths: { database: 'test' }, url: { app: url } } as Config

		mocks.getConfig.mockReturnValue(config)
		mocks.getDatabase.mockReturnValue(db)
		vi.spyOn(queries, 'execute').mockResolvedValue([
			{
				id: '1',
				type: 'test',
				date_added: new Date(0).toISOString(),
				date_updated: new Date(0).toISOString(),
			},
		])
		mocks.getLastRunFor.mockResolvedValue(new Date())
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)

		await generateOpenGraphs(
			{
				outputDir: 'test',
				host: 'test',
			},
			config
		)

		expect(mocks.generatePngFromUrl).not.toHaveBeenCalled()
		expect(mocks.setLastRunFor).toHaveBeenCalledOnce()
	})

	test('should force generation', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		const url = 'http://localhost'
		const config = { paths: { database: 'test' }, url: { app: url } } as Config

		mocks.getConfig.mockReturnValue(config)
		mocks.getDatabase.mockReturnValue(db)
		vi.spyOn(queries, 'execute').mockResolvedValue([
			{
				id: '1',
				type: 'test',
				date_added: new Date(0).toISOString(),
				date_updated: new Date(0).toISOString(),
			},
		])
		mocks.getLastRunFor.mockResolvedValue(new Date())
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)

		await generateOpenGraphs(
			{
				outputDir: 'test',
				host: 'test',
				force: true,
			},
			config
		)

		expect(mocks.generatePngFromUrl).toHaveBeenCalledOnce()
		expect(mocks.setLastRunFor).toHaveBeenCalledOnce()
	})

	test('should handle errors', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		const url = 'http://localhost'
		const config = { paths: { database: 'test' }, url: { app: url } } as Config

		mocks.getConfig.mockReturnValue(config)
		mocks.getDatabase.mockReturnValue(db)
		vi.spyOn(queries, 'execute').mockResolvedValue([
			{
				id: '1',
				type: 'test',
				date_added: new Date(0).toISOString(),
				date_updated: new Date().toISOString(),
			},
		])
		mocks.getLastRunFor.mockResolvedValue(new Date(0))
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)
		mocks.generatePngFromUrl.mockRejectedValue(new Error('Test error'))

		await generateOpenGraphs(
			{
				outputDir: 'test',
				host: 'test',
			},
			config
		)

		expect(consoleErrorSpy).toHaveBeenCalledOnce()
		expect(browser.close).toHaveBeenCalledOnce()
	})

	test('should use date_added if date_updated is null', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		const url = 'http://localhost'
		const config = { paths: { database: 'test' }, url: { app: url } } as Config

		mocks.getConfig.mockReturnValue(config)
		mocks.getDatabase.mockReturnValue(db)
		vi.spyOn(queries, 'execute').mockResolvedValue([
			{
				id: '1',
				type: 'test',
				slug: 'slug',
				date_added: new Date().toISOString(),
				date_updated: null,
			},
		])
		mocks.getLastRunFor.mockResolvedValue(new Date(0))
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)

		await generateOpenGraphs(
			{
				outputDir: 'test',
			},
			config
		)

		expect(mocks.generatePngFromUrl).toHaveBeenCalledWith(
			'http://localhost/api/pieces/test/slug/opengraph?mode=local',
			browser,
			expect.any(String)
		)
	})

	test('should not call setLastRunFor when id is provided', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		const url = 'http://localhost'
		const config = { paths: { database: 'test' }, url: { app: url } } as Config

		mocks.getConfig.mockReturnValue(config)
		mocks.getDatabase.mockReturnValue(db)
		vi.spyOn(queries, 'execute').mockResolvedValue([
			{
				id: '1',
				type: 'test',
				date_added: new Date(0).toISOString(),
				date_updated: new Date(0).toISOString(),
			},
		])
		mocks.getLastRunFor.mockResolvedValue(new Date())
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)

		await generateOpenGraphs(
			{
				outputDir: 'test',
				host: 'test',
				id: '1',
			},
			config
		)

		expect(mocks.setLastRunFor).not.toHaveBeenCalled()
	})
})
