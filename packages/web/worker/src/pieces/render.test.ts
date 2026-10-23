import { describe, test, expect, afterAll, beforeAll, beforeEach, vi } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import type * as FileSystem from 'node:fs'
import path from 'node:path'
import { validateConfig } from '@luzzle/web.config'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import type { PublicWebPiece, PublicWebPieceAsset } from '@luzzle/web.pieces'
import { renderOpengraphPng } from './render.js'

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof FileSystem>()
	return { ...actual, readFileSync: vi.fn(actual.readFileSync) }
})

const TEMP_DIR = path.join(import.meta.dirname, 'temp-render-fixtures')

const makeConfig = (): TemplateConfig => {
	const config: TemplateConfig = validateConfig({
		pieces: [{ type: 'books', fields: { title: 'title', date_consumed: 'date' } }],
	})
	config.paths.config = path.join(TEMP_DIR, 'config.yaml')
	config.paths.assets = './assets'
	config.paths.static = './static'
	config.pieces[0].templates = {
		icon: { name: 'default' },
		page: { name: 'default' },
		opengraph: {
			name: 'default',
			mapping: { image: 'cover', backdrop: 'background', director: 'author' },
		},
	}
	return config
}

const onePixelPng = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
)

const makePiece = (assets: PublicWebPieceAsset[] = []): PublicWebPiece => ({
	id: '1',
	key: 'k1',
	title: 'Luzzle Book',
	slug: 'luzzle-book',
	type: 'books',
	date_added: 1,
	metadata: { title: 'Luzzle Book', cover: 'img-key', background: 'backdrop-key', author: 'Ada' },
	assets,
})

function expectPng(buffer: Buffer) {
	expect(Buffer.isBuffer(buffer)).toBe(true)
	expect(buffer.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
	expect(buffer.readUInt32BE(16)).toBe(1200)
	expect(buffer.readUInt32BE(20)).toBe(630)
}

beforeAll(() => {
	mkdirSync(TEMP_DIR, { recursive: true })
})

beforeEach(() => {
	vi.clearAllMocks()
})

afterAll(() => {
	rmSync(TEMP_DIR, { recursive: true, force: true })
})

describe('pieces/render', () => {
	test('renders the packaged default component to a PNG without a piece configuration', async () => {
		const config = makeConfig()
		config.pieces = []
		expectPng(await renderOpengraphPng(makePiece(), [], config))
	})

	test.each([false, true])(
		'preloads mapped default poster and backdrop images (preview: %s)',
		async (preview) => {
			const config = makeConfig()
			const assetsDir = path.join(TEMP_DIR, preview ? 'preview' : 'assets')
			const mockImgDir = path.join(assetsDir, 'books/k1')
			mkdirSync(mockImgDir, { recursive: true })
			writeFileSync(path.join(mockImgDir, 'cover.png'), onePixelPng)
			writeFileSync(path.join(mockImgDir, 'backdrop.png'), onePixelPng)
			const assets: PublicWebPieceAsset[] = [
				{
					asset_key: 'img-key',
					transformation: 'image.original',
					asset_path: 'books/k1/cover.png',
					mime_type: 'image/png',
				},
				{
					asset_key: 'backdrop-key',
					transformation: 'image.l.jpg',
					asset_path: 'books/k1/backdrop.png',
					mime_type: 'image/png',
				},
			]

			expectPng(
				await renderOpengraphPng(makePiece(assets), assets, config, preview ? assetsDir : undefined)
			)
			expect(readFileSync).toHaveBeenCalledWith(path.join(mockImgDir, 'cover.png'))
			expect(readFileSync).toHaveBeenCalledWith(path.join(mockImgDir, 'backdrop.png'))
		}
	)
})
