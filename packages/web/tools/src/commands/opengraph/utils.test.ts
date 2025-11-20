import { describe, test, expect, vi, afterEach } from 'vitest'
import { getProps, findAndReplaceLuzzleUrls, bufferToBase64, replaceAsync } from './utils.js'
import { Pieces } from '@luzzle/cli'
import { Vibrant } from 'node-vibrant/node'
import { type WebPieces, type Config } from '@luzzle/web.utils'
import Sharp from 'sharp'
import path from 'path'
import * as cheerio from 'cheerio'
import { Component } from 'svelte'
import { getPalette } from '@luzzle/web.utils/server'

vi.mock('@luzzle/cli')
vi.mock('path')
vi.mock('@luzzle/web.utils/server')

const mocks = {
	Pieces: vi.mocked(Pieces),
	Vibrant: vi.mocked(Vibrant),
	Sharp: vi.mocked(Sharp),
	pathExtname: vi.spyOn(path, 'extname'),
	getPalette: vi.mocked(getPalette),
}

describe('src/commands/opengraph/utils', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('getProps', () => {
		test('should return opengraph props with correct data', async () => {
			const mockItem = {
				json_metadata: '{"title": "Test Title"}',
				keywords: '["tag1", "tag2"]',
				type: 'book',
				slug: 'test-book',
			} as WebPieces
			const mockIcon = {} as unknown as Component
			const mockPieces = {} as unknown as Pieces
			const mockConfig = {
				url: { app: 'http://localhost' },
			} as Config

			const props = await getProps(mockItem, mockIcon, mockPieces, mockConfig)

			expect(props.Icon).toBe(mockIcon)
			expect(props.metadata).toEqual({ title: 'Test Title' })
			expect(props.tags).toEqual(['tag1', 'tag2'])
			expect(props.size).toEqual({ width: 1200, height: 630 })
			expect(props.helpers.getPieceUrl()).toBe('http://localhost/pieces/book/test-book')
			expect(props.helpers.getPieceImageUrl('image.jpg', 100, 'jpg')).toBe('luzzle://image.jpg')
		})

		test('should return opengraph props with initial JSON parse data', async () => {
			const mockItem = {
				type: 'book',
				slug: 'test-book',
			} as WebPieces
			const mockIcon = {} as unknown as Component
			const mockPieces = {} as unknown as Pieces
			const mockConfig = {
				url: { app: 'http://localhost' },
			} as Config

			const props = await getProps(mockItem, mockIcon, mockPieces, mockConfig)

			expect(props.Icon).toBe(mockIcon)
			expect(props.metadata).toEqual({})
			expect(props.tags).toEqual([])
			expect(props.size).toEqual({ width: 1200, height: 630 })
			expect(props.helpers.getPieceUrl()).toBe('http://localhost/pieces/book/test-book')
			expect(props.helpers.getPieceImageUrl('image.jpg', 100, 'jpg')).toBe('luzzle://image.jpg')
		})

		test('should return opengraph props with palette', async () => {
			const mockItem = {
				type: 'book',
				slug: 'test-book',
				media: 'media-id',
			} as WebPieces
			const mockIcon = {} as unknown as Component
			const mockPieces = {
				getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
			} as unknown as Pieces
			const mockConfig = {
				url: { app: 'http://localhost' },
			} as Config
			const mockPalette = { VIBRANT: { hex: '#FFFFFF' } } as unknown as Awaited<
				ReturnType<typeof getPalette>
			>
			mocks.getPalette.mockResolvedValue(mockPalette)
			const props = await getProps(mockItem, mockIcon, mockPieces, mockConfig)

			expect(props.Icon).toBe(mockIcon)
			expect(props.metadata).toEqual({})
			expect(props.tags).toEqual([])
			expect(props.palette).toBe(mockPalette)
			expect(props.size).toEqual({ width: 1200, height: 630 })
			expect(props.helpers.getPieceUrl()).toBe('http://localhost/pieces/book/test-book')
			expect(props.helpers.getPieceImageUrl('image.jpg', 100, 'jpg')).toBe('luzzle://image.jpg')
		})

		test('should handle missing Icon component', async () => {
			const mockItem = {
				json_metadata: '{"title": "Test Title"}',
				keywords: '["tag1", "tag2"]',
				type: 'book',
				slug: 'test-book',
			} as WebPieces
			const mockPieces = {} as unknown as Pieces
			const mockConfig = {
				url: { app: 'http://localhost' },
			} as Config
			const mockPalette = { VIBRANT: { hex: '#FFFFFF' } } as unknown as Awaited<
				ReturnType<typeof Vibrant.prototype.getPalette>
			>

			vi.spyOn(Vibrant.prototype, 'getPalette').mockResolvedValue(mockPalette)
			vi.spyOn(Sharp.prototype, 'toBuffer').mockResolvedValue(Buffer.from('blank_image_data'))

			const props = await getProps(mockItem, null, mockPieces, mockConfig)

			expect(props.Icon).toBeUndefined()
		})
	})

	describe('replaceAsync', () => {
		test('should replace all matches asynchronously', async () => {
			const str = 'Hello world, hello universe!'
			const regex = /hello/gi
			const asyncFn = async (match: string) => Promise.resolve(match.toUpperCase())

			const result = await replaceAsync(str, regex, asyncFn)

			expect(result).toBe('HELLO world, HELLO universe!')
		})

		test('should handle no matches', async () => {
			const str = 'Hello world!'
			const regex = /foo/gi
			const asyncFn = async (match: string) => Promise.resolve(match.toUpperCase())

			const result = await replaceAsync(str, regex, asyncFn)

			expect(result).toBe('Hello world!')
		})

		test('should handle multiple capture groups', async () => {
			const str = 'url("luzzle://image.png")'
			const regex = /url\(([\\'"]?)(.*?)\1\)/g
			const asyncFn = async (_: string, quote: string, url: string) => {
				return `url(${quote}data:image/png;base64,${btoa(url)}${quote})`
			}

			const result = await replaceAsync(str, regex, asyncFn)
			expect(result).toBe('url("data:image/png;base64,bHV6emxlOi8vaW1hZ2UucG5n")')
		})
	})

	describe('findAndReplaceLuzzleUrls', () => {
		test('should replace luzzle:// in img src', async () => {
			const html = '<html><body><img src="luzzle://image.jpg"></body></html>'
			const mockPieces = {
				getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
			} as unknown as Pieces
			mocks.pathExtname.mockReturnValue('.jpg')

			const result = await findAndReplaceLuzzleUrls(html, mockPieces)
			const $ = cheerio.load(result)
			expect($('img').attr('src')).toBe('data:image/jpg;base64,aW1hZ2VfZGF0YQ==')
		})

		test('should replace luzzle:// in img srcset', async () => {
			const html =
				'<html><body><img srcset="luzzle://image.jpg 1x, luzzle://image@2x.jpg 2x"></body></html>'
			const mockPieces = {
				getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
			} as unknown as Pieces
			mocks.pathExtname.mockReturnValue('.jpg')

			const result = await findAndReplaceLuzzleUrls(html, mockPieces)
			const $ = cheerio.load(result)
			expect($('img').attr('srcset')).toContain('data:image/jpg;base64,aW1hZ2VfZGF0YQ== 1x')
			expect($('img').attr('srcset')).toContain('data:image/jpg;base64,aW1hZ2VfZGF0YQ== 2x')
		})

		test('should replace luzzle:// in style tag url()', async () => {
			const html =
				'<html><head><style>body { background-image: url(luzzle://bg.png); }</style></head></html>'
			const mockPieces = {
				getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
			} as unknown as Pieces
			mocks.pathExtname.mockReturnValue('.png')

			const result = await findAndReplaceLuzzleUrls(html, mockPieces)
			const $ = cheerio.load(result)
			expect($('style').html()).toContain(
				'background-image: url(data:image/png;base64,aW1hZ2VfZGF0YQ==);'
			)
		})

		test('should replace luzzle:// in inline style url()', async () => {
			const html =
				'<html><body><div style="background-image: url(\'luzzle://bg.png\');"></div></body></html>'
			const mockPieces = {
				getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
			} as unknown as Pieces
			mocks.pathExtname.mockReturnValue('.png')

			const result = await findAndReplaceLuzzleUrls(html, mockPieces)
			const $ = cheerio.load(result)
			expect($('div').attr('style')).toContain(
				"background-image: url('data:image/png;base64,aW1hZ2VfZGF0YQ==');"
			)
		})

		test('should handle multiple luzzle urls in different elements', async () => {
			const html = `
				<html>
					<body>
						<img src="luzzle://img1.jpg">
						<img srcset="luzzle://img2.jpg 1x">
						<div style="background: url(luzzle://bg.png);"></div>
						<style>
							.hero { background: url("luzzle://hero.jpg"); }
						</style>
					</body>
				</html>
			`
			const mockPieces = {
				getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
			} as unknown as Pieces
			mocks.pathExtname
				.mockReturnValueOnce('.jpg')
				.mockReturnValueOnce('.jpg')
				.mockReturnValueOnce('.png')
				.mockReturnValueOnce('.png')

			const result = await findAndReplaceLuzzleUrls(html, mockPieces)
			const $ = cheerio.load(result)

			expect($('img').eq(0).attr('src')).toBe('data:image/jpg;base64,aW1hZ2VfZGF0YQ==')
			expect($('img').eq(1).attr('srcset')).toContain('data:image/jpg;base64,aW1hZ2VfZGF0YQ== 1x')
			expect($('div').attr('style')).toContain(
				'background: url(data:image/png;base64,aW1hZ2VfZGF0YQ==);'
			)
			expect($('style').html()).toContain(
				'background: url("data:image/png;base64,aW1hZ2VfZGF0YQ==");'
			)
		})

		test('should not modify non-luzzle urls', async () => {
			const html = `
					<html>
						<body>
							<img src="http://example.com/image.jpg">
							<img srcset="/image.jpg 1x">
							<div style="background: url(/bg.png);"></div>
							<style>
								.hero { background: url("http://example.com/hero.jpg"); }
							</style>
						</body>
						</html>
			`
			const mockPieces = {
				getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
			} as unknown as Pieces
			mocks.pathExtname.mockReturnValue('.jpg')

			const result = await findAndReplaceLuzzleUrls(html, mockPieces)
			const $ = cheerio.load(result)

			expect($('img').eq(0).attr('src')).toBe('http://example.com/image.jpg')
			expect($('img').eq(1).attr('srcset')).toBe('/image.jpg 1x')
			// Cheerio might strip url() for simple cases, so check for the content
			expect($('div').attr('style')).toContain('background: url(/bg.png);')
			expect($('style').html()).toContain('background: url("http://example.com/hero.jpg");')
			expect($('style').html()).not.toContain('data:image/')
			expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		})
	})

	describe('bufferToBase64', () => {
		test('should convert a buffer to a base64 data URL', () => {
			const buffer = Buffer.from('test_data')
			const base64 = bufferToBase64(buffer, 'text', 'plain')
			expect(base64).toBe('data:text/plain;base64,dGVzdF9kYXRh')
		})
	})
})
