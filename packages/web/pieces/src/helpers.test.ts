import { describe, test, expect } from 'vitest'
import { createPieceHelpers, type PieceComponentHelpers } from './helpers.js'
import type { PublicWebPieceAsset } from '@luzzle/web.db'

const localBuilder = (p: string) => `/pieces/assets/${p}`
const cdnBuilder = (p: string) => `https://cdn.example.com/pieces/assets/${p}`
const previewBuilder = (jobId: string) => (p: string) => `/admin/preview/${jobId}/asset/${p}`
const pieceUrl = () => '/pieces/books/a-beautiful-piece'

function makeHelpers(
	assets: PublicWebPieceAsset[] = [],
	buildAssetUrl = localBuilder,
	buildPieceUrl = pieceUrl
): PieceComponentHelpers {
	return createPieceHelpers(assets, buildAssetUrl, buildPieceUrl)
}

describe('createPieceHelpers', () => {
	test('getPieceUrl returns the value from buildPieceUrl', () => {
		const helpers = makeHelpers()
		expect(helpers.getPieceUrl()).toBe('/pieces/books/a-beautiful-piece')
	})

	test('getPieceUrl works with absolute URLs', () => {
		const helpers = makeHelpers([], localBuilder, () => 'https://example.com/pieces/books/slug')
		expect(helpers.getPieceUrl()).toBe('https://example.com/pieces/books/slug')
	})

	test('getPiecePalette returns palette object if present', () => {
		const paletteContent = JSON.stringify({
			background: '#123456',
			accent: '#abcdef'
		})
		const helpers = makeHelpers([
			{
				asset_key: 'some-key',
				transformation: 'palette',
				mime_type: 'application/json',
				content: paletteContent
			}
		])
		expect(helpers.getPiecePalette()).toEqual({
			background: '#123456',
			accent: '#abcdef'
		})
	})

	test('getPiecePalette returns undefined if palette is missing', () => {
		const helpers = makeHelpers()
		expect(helpers.getPiecePalette()).toBeUndefined()
	})

	test('getPieceAssetUrl returns resolved URL with local builder', () => {
		const helpers = makeHelpers([
			{
				asset_key: 'asset-key-1',
				transformation: 'custom-transform',
				asset_path: 'path/to/asset.png',
				mime_type: 'image/png'
			}
		])
		expect(helpers.getPieceAssetUrl('asset-key-1', 'custom-transform')).toBe(
			'/pieces/assets/path/to/asset.png'
		)
	})

	test('getPieceAssetUrl returns resolved URL with CDN builder', () => {
		const helpers = makeHelpers(
			[
				{
					asset_key: 'asset-key-1',
					transformation: 'custom-transform',
					asset_path: 'path/to/asset.png',
					mime_type: 'image/png'
				}
			],
			cdnBuilder
		)
		expect(helpers.getPieceAssetUrl('asset-key-1', 'custom-transform')).toBe(
			'https://cdn.example.com/pieces/assets/path/to/asset.png'
		)
	})

	test('getPieceAssetUrl returns resolved URL with preview builder', () => {
		const helpers = makeHelpers(
			[
				{
					asset_key: 'asset-key-1',
					transformation: 'custom-transform',
					asset_path: 'path/to/asset.png',
					mime_type: 'image/png'
				}
			],
			previewBuilder('42')
		)
		expect(helpers.getPieceAssetUrl('asset-key-1', 'custom-transform')).toBe(
			'/admin/preview/42/asset/path/to/asset.png'
		)
	})

	test('getPieceAssetUrl returns undefined when not found', () => {
		const helpers = makeHelpers()
		expect(helpers.getPieceAssetUrl('missing', 'transform')).toBeUndefined()
	})

	test('getPieceAssetContent returns raw content', () => {
		const helpers = makeHelpers([
			{
				asset_key: 'asset-key-1',
				transformation: 'text-transform',
				content: 'raw content here',
				mime_type: 'text/plain'
			}
		])
		expect(helpers.getPieceAssetContent('asset-key-1', 'text-transform')).toBe(
			'raw content here'
		)
	})

	test('getPieceImageUrl returns transformed image url by category size', () => {
		const helpers = makeHelpers([
			{
				asset_key: 'cover-asset-key',
				transformation: 'image.m.webp',
				asset_path: 'cover-m.webp',
				mime_type: 'image/webp'
			}
		])
		expect(helpers.getPieceImageUrl('cover-asset-key', 200, 'webp')).toBe(
			'/pieces/assets/cover-m.webp'
		)
	})

	test('getPieceImageUrl falls back to original if transformed not found', () => {
		const helpers = makeHelpers([
			{
				asset_key: 'cover-asset-key',
				transformation: 'image.original',
				asset_path: 'cover-original.jpg',
				mime_type: 'image/jpeg'
			}
		])
		expect(helpers.getPieceImageUrl('cover-asset-key', 200, 'webp')).toBe(
			'/pieces/assets/cover-original.jpg'
		)
	})

	test('getPieceImageUrl returns undefined if asset not found', () => {
		const helpers = makeHelpers()
		expect(helpers.getPieceImageUrl('non-existent', 200, 'webp')).toBeUndefined()
	})

	test('getPieceImageUrl returns undefined for null/undefined keys', () => {
		const helpers = makeHelpers([
			{
				asset_key: 'cover-asset-key',
				transformation: 'image.m.webp',
				asset_path: 'cover-m.webp',
				mime_type: 'image/webp'
			}
		])
		expect(helpers.getPieceImageUrl(null, 200, 'webp')).toBeUndefined()
		expect(helpers.getPieceImageUrl(undefined, 200, 'webp')).toBeUndefined()
	})

	test('getPieceImageUrl size categories map correctly', () => {
		const assets: PublicWebPieceAsset[] = [
			{ asset_key: 'k', transformation: 'image.s.jpg', asset_path: 's.jpg', mime_type: 'image/jpeg' },
			{ asset_key: 'k', transformation: 'image.m.jpg', asset_path: 'm.jpg', mime_type: 'image/jpeg' },
			{ asset_key: 'k', transformation: 'image.l.jpg', asset_path: 'l.jpg', mime_type: 'image/jpeg' },
			{ asset_key: 'k', transformation: 'image.xl.jpg', asset_path: 'xl.jpg', mime_type: 'image/jpeg' },
		]
		const helpers = makeHelpers(assets)

		expect(helpers.getPieceImageUrl('k', 100, 'jpg')).toBe('/pieces/assets/s.jpg')
		expect(helpers.getPieceImageUrl('k', 125, 'jpg')).toBe('/pieces/assets/s.jpg')
		expect(helpers.getPieceImageUrl('k', 200, 'jpg')).toBe('/pieces/assets/m.jpg')
		expect(helpers.getPieceImageUrl('k', 250, 'jpg')).toBe('/pieces/assets/m.jpg')
		expect(helpers.getPieceImageUrl('k', 400, 'jpg')).toBe('/pieces/assets/l.jpg')
		expect(helpers.getPieceImageUrl('k', 500, 'jpg')).toBe('/pieces/assets/l.jpg')
		expect(helpers.getPieceImageUrl('k', 800, 'jpg')).toBe('/pieces/assets/xl.jpg')
	})

	test('getPieceImageUrl uses CDN builder for all URL types', () => {
		const helpers = makeHelpers(
			[
				{
					asset_key: 'cover',
					transformation: 'image.m.webp',
					asset_path: 'books/k1/cover-m.webp',
					mime_type: 'image/webp'
				}
			],
			cdnBuilder
		)
		expect(helpers.getPieceImageUrl('cover', 200, 'webp')).toBe(
			'https://cdn.example.com/pieces/assets/books/k1/cover-m.webp'
		)
	})
})
