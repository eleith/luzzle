import { describe, test, expect } from 'vitest'
import { getPieceHelpers, type PublicWebPiece, type PublicWebPieceAsset } from './helpers.js'

const makeMockPiece = (assets: PublicWebPieceAsset[] = []): PublicWebPiece => ({
	id: 'piece-1',
	key: 'piece-key',
	title: 'A Beautiful Piece',
	slug: 'a-beautiful-piece',
	type: 'books',
	date_added: 123456789,
	metadata: {
		cover: 'cover-asset-key'
	},
	assets
})

describe('pieces/helpers', () => {
	test('getPieceUrl returns correct relative URL', () => {
		const piece = makeMockPiece()
		const helpers = getPieceHelpers(piece)
		expect(helpers.getPieceUrl()).toBe('/pieces/books/a-beautiful-piece')
	})

	test('getPiecePalette returns palette object if present', () => {
		const paletteContent = JSON.stringify({
			background: '#123456',
			accent: '#abcdef'
		})
		const piece = makeMockPiece([
			{
				asset_key: 'some-key',
				transformation: 'palette',
				mime_type: 'application/json',
				content: paletteContent
			}
		])
		const helpers = getPieceHelpers(piece)
		expect(helpers.getPiecePalette()).toEqual({
			background: '#123456',
			accent: '#abcdef'
		})
	})

	test('getPiecePalette returns undefined if palette is missing', () => {
		const piece = makeMockPiece()
		const helpers = getPieceHelpers(piece)
		expect(helpers.getPiecePalette()).toBeUndefined()
	})

	test('getPieceAssetUrl returns resolved URL', () => {
		const piece = makeMockPiece([
			{
				asset_key: 'asset-key-1',
				transformation: 'custom-transform',
				asset_path: 'path/to/asset.png',
				mime_type: 'image/png'
			}
		])
		const helpers = getPieceHelpers(piece, '/custom-prefix/')
		expect(helpers.getPieceAssetUrl('asset-key-1', 'custom-transform')).toBe(
			'/custom-prefix/path/to/asset.png'
		)
	})

	test('getPieceAssetContent returns raw content', () => {
		const piece = makeMockPiece([
			{
				asset_key: 'asset-key-1',
				transformation: 'text-transform',
				content: 'raw content here',
				mime_type: 'text/plain'
			}
		])
		const helpers = getPieceHelpers(piece)
		expect(helpers.getPieceAssetContent('asset-key-1', 'text-transform')).toBe(
			'raw content here'
		)
	})

	test('getPieceImageUrl returns transformed image url by category size if found', () => {
		const piece = makeMockPiece([
			{
				asset_key: 'cover-asset-key',
				transformation: 'image.m.webp',
				asset_path: 'cover-m.webp',
				mime_type: 'image/webp'
			}
		])
		const helpers = getPieceHelpers(piece)
		// minWidth 200 falls into Category 'm'
		expect(helpers.getPieceImageUrl('cover-asset-key', 200, 'webp')).toBe(
			'/pieces/assets/cover-m.webp'
		)
	})

	test('getPieceImageUrl falls back to original if transformed not found', () => {
		const piece = makeMockPiece([
			{
				asset_key: 'cover-asset-key',
				transformation: 'image.original',
				asset_path: 'cover-original.jpg',
				mime_type: 'image/jpeg'
			}
		])
		const helpers = getPieceHelpers(piece)
		expect(helpers.getPieceImageUrl('cover-asset-key', 200, 'webp')).toBe(
			'/pieces/assets/cover-original.jpg'
		)
	})

	test('getPieceImageUrl returns undefined if asset not found', () => {
		const piece = makeMockPiece()
		const helpers = getPieceHelpers(piece)
		expect(helpers.getPieceImageUrl('non-existent', 200, 'webp')).toBeUndefined()
	})
})
