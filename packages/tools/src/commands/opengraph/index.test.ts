import { describe, test, vi, afterEach, expect } from 'vitest'
import generateOpenGraphs from './index.js'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { generateHtml } from './html.js'
import { generatePng } from './png.js'
import { getBrowser } from './browser.js'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { getDatabaseClient } from '@luzzle/core'
import { Config, loadConfig } from '../../lib/config/config.js'
import { mockKysely } from '../sqlite/database.mock.js'
import { Browser } from 'puppeteer'

vi.mock('../../lib/lastRun.js')
vi.mock('./html.js')
vi.mock('./png.js')
vi.mock('./browser.js')
vi.mock('@luzzle/cli')
vi.mock('@luzzle/core')
vi.mock('../../lib/config/config.js')

const mocks = {
	getLastRunFor: vi.mocked(getLastRunFor),
	setLastRunFor: vi.mocked(setLastRunFor),
	generateHtml: vi.mocked(generateHtml),
	generatePng: vi.mocked(generatePng),
	getBrowser: vi.mocked(getBrowser),
	getDatabaseClient: vi.mocked(getDatabaseClient),
	loadConfig: vi.mocked(loadConfig),
	StorageFileSystem: vi.mocked(StorageFileSystem),
	Pieces: vi.mocked(Pieces),
}

describe('tools/opengraph', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
		vi.clearAllMocks()
	})

	test('should generate an opengraph image for a single item', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		mocks.loadConfig.mockReturnValue({ paths: { database: 'test' } } as Config)
		mocks.getDatabaseClient.mockReturnValue(db)
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
		mocks.generateHtml.mockResolvedValue('<html></html>')
		mocks.generatePng.mockResolvedValue(Buffer.from('test'))

		await generateOpenGraphs('test', 'test', 'test', {})

		expect(mocks.loadConfig).toHaveBeenCalledOnce()
		expect(mocks.getDatabaseClient).toHaveBeenCalledOnce()
		expect(mocks.getLastRunFor).toHaveBeenCalledOnce()
		expect(mocks.getBrowser).toHaveBeenCalledOnce()
		expect(mocks.generateHtml).toHaveBeenCalledOnce()
		expect(mocks.generatePng).toHaveBeenCalledWith(
			'<html></html>',
			browser,
			'test/test/1/opengraph.png'
		)
		expect(mocks.setLastRunFor).toHaveBeenCalledOnce()
		expect(browser.close).toHaveBeenCalledOnce()
	})

	test('should not generate if item is not updated', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		mocks.loadConfig.mockReturnValue({ paths: { database: 'test' } } as Config)
		mocks.getDatabaseClient.mockReturnValue(db)
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

		await generateOpenGraphs('test', 'test', 'test', {})

		expect(mocks.generateHtml).not.toHaveBeenCalled()
		expect(mocks.generatePng).not.toHaveBeenCalled()
		expect(mocks.setLastRunFor).toHaveBeenCalledOnce()
	})

	test('should force generation', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		const html = 'html'

		mocks.loadConfig.mockReturnValue({ paths: { database: 'test' } } as Config)
		mocks.getDatabaseClient.mockReturnValue(db)
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
		mocks.generateHtml.mockResolvedValue(html)

		await generateOpenGraphs('test', 'test', 'test', { force: true })

		expect(mocks.generateHtml).toHaveBeenCalledOnce()
		expect(mocks.generatePng).toHaveBeenCalledOnce()
		expect(mocks.setLastRunFor).toHaveBeenCalledOnce()
	})

	test('should handle errors', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		mocks.loadConfig.mockReturnValue({ paths: { database: 'test' } } as Config)
		mocks.getDatabaseClient.mockReturnValue(db)
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
		mocks.generateHtml.mockRejectedValue(new Error('test error'))

		await generateOpenGraphs('test', 'test', 'test', {})

		expect(consoleErrorSpy).toHaveBeenCalledOnce()
		expect(browser.close).toHaveBeenCalledOnce()
	})

	test('should use date_added if date_updated is null', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		const html = 'html'
		mocks.loadConfig.mockReturnValue({ paths: { database: 'test' } } as Config)
		mocks.getDatabaseClient.mockReturnValue(db)
		vi.spyOn(queries, 'execute').mockResolvedValue([
			{
				id: '1',
				type: 'test',
				date_added: new Date().toISOString(),
				date_updated: null,
			},
		])
		mocks.getLastRunFor.mockResolvedValue(new Date(0))
		mocks.getBrowser.mockResolvedValue(browser as unknown as Browser)
		mocks.generateHtml.mockResolvedValue(html)

		await generateOpenGraphs('test', 'test', 'test', {})

		expect(mocks.generateHtml).toHaveBeenCalledOnce()
		expect(mocks.generatePng).toHaveBeenCalledOnce()
	})

	test('should not call setLastRunFor when id is provided', async () => {
		const { db, queries } = mockKysely()
		const browser = { close: vi.fn() }
		mocks.loadConfig.mockReturnValue({ paths: { database: 'test' } } as Config)
		mocks.getDatabaseClient.mockReturnValue(db)
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

		await generateOpenGraphs('test', 'test', 'test', { id: '1' })

		expect(mocks.setLastRunFor).not.toHaveBeenCalled()
	})
})

