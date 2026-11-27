import { describe, test, expect } from 'vitest'
import { createPieceHelpers } from './helpers.js'
import type { PublicWebPieceAsset } from '@luzzle/web.db'

function makeHelpers(assets: PublicWebPieceAsset[] = [], buildAssetUrl = (path: string) => path) {
	return createPieceHelpers(assets, buildAssetUrl)
}

describe('createPieceHelpers', () => {
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

	test('getPieceAssetUrl returns resolved URL from the supplied builder', () => {
		const helpers = makeHelpers([
			{
				asset_key: 'asset-key-1',
				transformation: 'custom-transform',
				asset_path: 'path/to/asset.png',
				mime_type: 'image/png'
			}
		], (path) => `resolved:${path}`)
		expect(helpers.getPieceAssetUrl('asset-key-1', 'custom-transform')).toBe(
			'resolved:path/to/asset.png'
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

	test('getPieceImageUrl falls back to original if transformed not found', () => {
		const helpers = makeHelpers([
			{
				asset_key: 'cover-asset-key',
				transformation: 'image.original',
				asset_path: 'cover-original.jpg',
				mime_type: 'image/jpeg'
			}
		])
		expect(helpers.getPieceImageUrl('cover-asset-key', 200, 'webp')).toBe('cover-original.jpg')
	})

	test.each(['missing', null, undefined])('getPieceImageUrl returns undefined for %s', (key) => {
		const helpers = makeHelpers()
		expect(helpers.getPieceImageUrl(key, 200, 'webp')).toBeUndefined()
	})

	test('getPieceImageUrl size categories map correctly', () => {
		const assets = ['s', 'm', 'l', 'xl'].map((size) => ({
			asset_key: 'k', transformation: `image.${size}.jpg`, asset_path: `${size}.jpg`, mime_type: 'image/jpeg'
		}))
		const helpers = makeHelpers(assets, (path) => `selected:${path}`)

		expect(helpers.getPieceImageUrl('k', 125, 'jpg')).toBe('selected:s.jpg')
		expect(helpers.getPieceImageUrl('k', 250, 'jpg')).toBe('selected:m.jpg')
		expect(helpers.getPieceImageUrl('k', 500, 'jpg')).toBe('selected:l.jpg')
		expect(helpers.getPieceImageUrl('k', 800, 'jpg')).toBe('selected:xl.jpg')
	})
})
