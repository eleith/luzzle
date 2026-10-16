import { describe, test, expect, vi, afterEach, beforeAll, afterAll } from 'vitest'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { run } from './opengraph.js'
import { getOpenGraphPath } from '../assets/paths.js'
import { renderOpengraphPng } from '../pieces/render.js'
import type { Config } from '@luzzle/web.config'
import type { WebPieces } from '../services/db.js'
import type { Pieces } from '@luzzle/core'
import { makeLogger } from '../../test/logger.js'

const TEMP_DIR = path.join(import.meta.dirname, 'temp-opengraph-transform-fixtures')
let renderedPng: Buffer

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

const makeInput = () => ({
	webPiece: makeWebPiece(),
	config: makeConfig(),
	outDir: TEMP_DIR,
	pieces: {} as Pieces,
	assetKeyToPath: new Map<string, string>(),
	logger: makeLogger(),
})

beforeAll(async () => {
	mkdirSync(TEMP_DIR, { recursive: true })
	renderedPng = await sharp({
		create: {
			width: 1200,
			height: 630,
			channels: 4,
			background: { r: 30, g: 60, b: 90, alpha: 0.5 },
		},
	}).png({ compressionLevel: 0 }).toBuffer()
})

afterAll(() => {
	rmSync(TEMP_DIR, { recursive: true, force: true })
})

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/opengraph', () => {
	test('writes a smaller PNG preserving dimensions and transparency, and returns its asset record', async () => {
		const input = makeInput()
		mocks.getOpenGraphPath.mockReturnValue('books/key/opengraph.png')
		mocks.renderOpengraphPng.mockResolvedValue(renderedPng)

		const records = await run(input)

		const output = readFileSync(path.join(TEMP_DIR, 'books/key/opengraph.png'))
		expect(output.length).toBeLessThan(renderedPng.length)
		expect(await sharp(output).metadata()).toEqual(expect.objectContaining({
			format: 'png',
			width: 1200,
			height: 630,
			hasAlpha: true,
		}))
		const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
		expect(data[info.channels - 1]).toBe(128)
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

	test('keeps the original PNG when palette encoding would make it larger', async () => {
		const original = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
			'base64'
		)
		mocks.getOpenGraphPath.mockReturnValue('books/tiny/opengraph.png')
		mocks.renderOpengraphPng.mockResolvedValue(original)

		await run(makeInput())

		expect(readFileSync(path.join(TEMP_DIR, 'books/tiny/opengraph.png'))).toEqual(original)
	})

	test('propagates encoding errors without writing an output', async () => {
		mocks.getOpenGraphPath.mockReturnValue('books/invalid/opengraph.png')
		mocks.renderOpengraphPng.mockResolvedValue(Buffer.from('invalid PNG'))

		await expect(run(makeInput())).rejects.toThrow()

		expect(existsSync(path.join(TEMP_DIR, 'books/invalid/opengraph.png'))).toBe(false)
	})

	test('passes priorAssets to renderOpengraphPng', async () => {
		mocks.getOpenGraphPath.mockReturnValue('books/key/opengraph.png')
		mocks.renderOpengraphPng.mockResolvedValue(renderedPng)

		const priorAssets = [
			{
				asset_key: 'img-key',
				transformation: 'image.original',
				asset_path: 'books/k1/cover.png',
				mime_type: 'image/png',
			},
		]

		const input = makeInput()
		const records = await run({ ...input, priorAssets })

		expect(mocks.renderOpengraphPng).toHaveBeenCalledWith(
			expect.objectContaining({ assets: priorAssets }),
			priorAssets,
			input.config,
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
