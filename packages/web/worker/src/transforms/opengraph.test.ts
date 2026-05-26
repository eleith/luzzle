import { describe, test, expect, vi, afterEach, beforeAll, afterAll } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { run } from './opengraph.js'
import { getOpenGraphPath } from '../assets/paths.js'
import { renderOpengraphPng } from '../pieces/render.js'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../services/db.js'
import { Pieces } from '@luzzle/core'
import { makeLogger } from '../../test/logger.js'

const TEMP_DIR = path.join(import.meta.dirname, 'temp-opengraph-transform-fixtures')

vi.mock('../pieces/render.js', () => ({
	renderOpengraphPng: vi.fn(),
}))

vi.mock('../assets/paths.js')

const mocks = {
	renderOpengraphPng: vi.mocked(renderOpengraphPng),
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
	test('generates opengraph image and returns asset record', async () => {
		const mockPieces = {} as unknown as Pieces

		mocks.getOpenGraphPath.mockReturnValue('books/key/opengraph.png')
		mocks.renderOpengraphPng.mockResolvedValue(Buffer.from('png-data'))

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

	test('passes priorAssets to renderOpengraphPng', async () => {
		const mockPieces = {} as unknown as Pieces

		mocks.getOpenGraphPath.mockReturnValue('books/key/opengraph.png')
		mocks.renderOpengraphPng.mockResolvedValue(Buffer.from('png-data'))

		const priorAssets = [
			{
				asset_key: 'img-key',
				transformation: 'image.original',
				asset_path: 'books/k1/cover.png',
				mime_type: 'image/png'
			}
		]

		const records = await run({
			webPiece: makeWebPiece(),
			config: makeConfig(),
			outDir: TEMP_DIR,
			pieces: mockPieces,
			assetKeyToPath: new Map(),
			logger: makeLogger(),
			priorAssets,
		})

		expect(mocks.renderOpengraphPng).toHaveBeenCalledWith(
			expect.objectContaining({
				assets: priorAssets
			}),
			priorAssets,
			expect.anything(),
			TEMP_DIR
		)
		expect(records).toEqual([
			expect.objectContaining({
				transformation: 'opengraph',
				mime_type: 'image/png',
				asset_path: 'books/key/opengraph.png',
			}),
		])
	})
})
