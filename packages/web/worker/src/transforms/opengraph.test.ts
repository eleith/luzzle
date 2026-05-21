import { describe, test, expect, vi, afterEach, beforeAll, afterAll } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { run } from './opengraph.js'
import { getOpenGraphPath } from '../assets/paths.js'
import { renderOpengraphPng } from '../pieces/render.js'
import { getWorkerContext } from '../services/context.js'
import type { Config } from '@luzzle/web.config'
import type { WebPieces, AppDatabase } from '../services/db.js'
import { Pieces } from '@luzzle/core'
import { makeLogger } from '../../test/logger.js'
import type { Kysely } from 'kysely'
import type { Logger } from '../services/logger.js'
import type { RcloneClient } from '../services/rclone.js'

const TEMP_DIR = path.join(import.meta.dirname, 'temp-opengraph-transform-fixtures')

vi.mock('../pieces/render.js', () => ({
	renderOpengraphPng: vi.fn(),
}))

vi.mock('../services/context.js', () => ({
	getWorkerContext: vi.fn(),
}))

vi.mock('../assets/paths.js')

const mocks = {
	renderOpengraphPng: vi.mocked(renderOpengraphPng),
	getWorkerContext: vi.mocked(getWorkerContext),
	getOpenGraphPath: vi.mocked(getOpenGraphPath),
}

const makeWebPiece = (): WebPieces => ({
	id: '1',
	type: 'books',
	date_updated: 100,
	date_added: 50,
	json_metadata: '{}',
	file_path: 'book.md',
	key: 'key',
	slug: 'my-book',
	title: 'My Book',
})

const makeConfig = (): Config =>
	({
		pieces: [{ type: 'books', fields: { title: 'title' } }],
		assets: { salt: 'test-salt' },
		url: { app: 'http://localhost' },
	}) as unknown as Config

beforeAll(() => {
	mkdirSync(TEMP_DIR, { recursive: true })
})

afterAll(() => {
	rmSync(TEMP_DIR, { recursive: true, force: true })
})

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/opengraph', () => {
	test('generates opengraph image using renderOpengraphPng and returns asset record', async () => {
		const mockPieces = {} as unknown as Pieces

		mocks.getOpenGraphPath.mockReturnValue('books/key/opengraph.png')
		mocks.renderOpengraphPng.mockResolvedValue(Buffer.from('png-data'))

		const mockDb = {
			selectFrom: vi.fn().mockReturnThis(),
			selectAll: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue([]),
		}
		mocks.getWorkerContext.mockReturnValue({
			db: mockDb as unknown as Kysely<AppDatabase>,
			config: {} as unknown as Config,
			logger: {} as unknown as Logger,
			rclone: {} as unknown as RcloneClient,
		})

		const records = await run({
			webPiece: makeWebPiece(),
			config: makeConfig(),
			outDir: TEMP_DIR,
			pieces: mockPieces,
			assetKeyToPath: new Map(),
			logger: makeLogger(),
		})

		expect(mocks.getOpenGraphPath).toHaveBeenCalledWith('books', 'key')
		expect(mocks.renderOpengraphPng).toHaveBeenCalledOnce()
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'opengraph',
				mime_type: 'image/png',
				asset_path: 'books/key/opengraph.png',
			}),
		])
	})
})
