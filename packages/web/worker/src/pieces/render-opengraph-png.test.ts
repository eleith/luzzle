import { describe, test, expect, afterAll, beforeAll, beforeEach, vi } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import type * as FileSystem from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { validateConfig } from '@luzzle/web.config'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import type { PublicWebPiece, PublicWebPieceAsset } from '@luzzle/web.pieces'
import { renderOpengraphPng } from './render-opengraph-png.js'
import { ImageResponse } from 'takumi-js/response'
import type * as TakumiResponse from 'takumi-js/response'

vi.mock('takumi-js/response', async (importOriginal) => {
	const actual = await importOriginal<typeof TakumiResponse>()
	return {
		...actual,
		ImageResponse: vi.fn(function (...args: ConstructorParameters<typeof actual.ImageResponse>) {
			return new actual.ImageResponse(...args)
		}),
	}
})

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof FileSystem>()
	return { ...actual, readFileSync: vi.fn(actual.readFileSync) }
})

const TEMP_DIR = path.join(import.meta.dirname, 'temp-render-fixtures')

const makeConfig = (): TemplateConfig => {
	const config: TemplateConfig = validateConfig({
		pieces: { books: { fields: { title: 'title', date_consumed: 'date' } } },
	})
	config.paths.config = path.join(TEMP_DIR, 'config.yaml')
	config.paths.assets = './assets'
	config.paths.static = './static'
	config.pieces.books.templates = {
		icon: { name: 'default' },
		page: { name: 'default' },
		opengraph: {
			name: 'default',
			mapping: { image: 'cover', backdrop: 'background', director: 'author', dateReleased: 'released', runtime: 'minutes' },
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

describe('pieces/render-opengraph-png', () => {
	test('keeps configured fonts and fixed root sizing in the PNG renderer', async () => {
		const config = makeConfig()
		const fontPath = path.resolve(import.meta.dirname, '../../assets/fonts/noto-sans.woff2')
		const fontBytes = readFileSync(fontPath)
		const localFont = path.join(TEMP_DIR, 'local-sans.woff2')
		writeFileSync(localFont, fontBytes)
		config.content.fonts = { sans: './local-sans.woff2' }
		config.theme.globals = {
			...config.theme.globals,
			'font-sans-name': "'Noto Sans'",
			'font-sans-url': "'/fonts/not-the-configured-font.woff2'",
		}

		expectPng(await renderOpengraphPng(makePiece(), [], config))
		expect(vi.mocked(ImageResponse).mock.calls.at(-1)![1]).toEqual(
			expect.objectContaining({
				fonts: [{ name: 'Noto Sans', data: fontBytes }],
				css: expect.arrayContaining([
					':root { font-size: calc(var(--font-size-root) * 1px); }',
				]),
			})
		)
	})

	test('isolates authored card module state and local covers between preview and publish', async () => {
		const config = makeConfig()
		const file = path.join(TEMP_DIR, 'card.svelte')
		writeFileSync(
			file,
			`<script module>let firstTitle;</script>
			<script>let { piece, fields, helpers } = $props(); firstTitle ??= piece.title;</script>
			{#if firstTitle === piece.title}
				<div style:background-image={'url(' + helpers.getPieceImageUrl(fields.jacket, 500, 'jpg') + ')'}></div>
			{/if}
			<style>div { width:300px; height:300px; background-size:cover }</style>`
		)
		config.pieces.books.templates!.opengraph = { name: 'default', file, mapping: { jacket: 'cover' } }
		const assets = [
			{
				asset_key: 'img-key',
				transformation: 'image.original',
				asset_path: 'cover.png',
				mime_type: 'image/png',
			},
		]
		const piece = makePiece(assets)
		async function writeCover(dir: string, color: string) {
			mkdirSync(dir, { recursive: true })
			await sharp({ create: { width: 8, height: 8, channels: 3, background: color } })
				.png()
				.toFile(path.join(dir, 'cover.png'))
		}
		const previewDir = path.join(TEMP_DIR, 'draft')
		await writeCover(previewDir, '#cc2299')
		await writeCover(path.join(TEMP_DIR, 'assets'), '#22bb66')

		const preview = await renderOpengraphPng(
			{ ...piece, title: 'Draft' },
			assets,
			config,
			previewDir,
			'preview'
		)
		const published = await renderOpengraphPng(piece, assets, config)
		const coverPixel = (png: Buffer) =>
			sharp(png)
				.extract({ left: 100, top: 100, width: 1, height: 1 })
				.removeAlpha()
				.raw()
				.toBuffer()
		expect((await coverPixel(preview)).toString('hex')).toBe('cc2299')
		expect((await coverPixel(published)).toString('hex')).toBe('22bb66')
	})

	test('renders the packaged default component to a PNG without a piece configuration', async () => {
		const config = makeConfig()
		config.pieces = {}
		expectPng(await renderOpengraphPng(makePiece(), [], config))
	})

	test('renders the mapped cover in the published PNG and preloads the backdrop', async () => {
		const config = makeConfig()
		const mockImgDir = path.join(TEMP_DIR, 'assets/books/k1')
		mkdirSync(mockImgDir, { recursive: true })
		const coverColor = { r: 246, g: 27, b: 218 }
		await sharp({ create: { width: 8, height: 8, channels: 3, background: coverColor } })
			.png()
			.toFile(path.join(mockImgDir, 'cover &amp;&#%2F?é".png'))
		writeFileSync(path.join(mockImgDir, 'backdrop.png'), onePixelPng)
		const assets: PublicWebPieceAsset[] = [
			{
				asset_key: 'img-key',
				transformation: 'image.original',
				asset_path: 'books/k1/cover &amp;&#%2F?é".png',
				mime_type: 'image/png',
			},
			{
				asset_key: 'backdrop-key',
				transformation: 'image.l.jpg',
				asset_path: 'books/k1/backdrop.png',
				mime_type: 'image/png',
			},
		]

		const piece = makePiece(assets)
		piece.date_consumed = Date.UTC(2025, 0, 2)
		piece.metadata = { ...piece.metadata, released: '2024-01-01', minutes: 0 }
		const png = await renderOpengraphPng(piece, assets, config)
		expect(vi.mocked(ImageResponse).mock.calls.at(-1)![0]).toContain('2024 · 0 min · 1.2.2025')
		const pixels = await sharp(png).removeAlpha().raw().toBuffer()
		const hasCoverColor = pixels.some((r, i) =>
			i % 3 === 0 && r === coverColor.r && pixels[i + 1] === coverColor.g && pixels[i + 2] === coverColor.b
		)
		expect(hasCoverColor).toBe(true)
		expect(readFileSync).toHaveBeenCalledWith(path.join(mockImgDir, 'backdrop.png'))
	})
})
