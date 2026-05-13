import { describe, expect, test } from 'vitest'
import {
	loadConfig,
	getConfigValue,
	setConfigValue,
	type ConfigPublic,
	type WebPieceTags,
	type WebPiecesAsset,
	type WebPieces,
} from './index.js'

describe('index (package entry point)', () => {
	test('should export loadConfig as a function', () => {
		expect(typeof loadConfig).toBe('function')
	})

	test('should export getConfigValue as a function', () => {
		expect(typeof getConfigValue).toBe('function')
	})

	test('should export setConfigValue as a function', () => {
		expect(typeof setConfigValue).toBe('function')
	})

	test('should export Config type (compile-time check)', () => {
		const config = loadConfig()
		expect(config.url).toBeDefined()
		expect(config.auth).toBeDefined()
		expect(config.storage).toBeDefined()
	})

	test('should export ConfigPublic type (compile-time check)', () => {
		const config = loadConfig()
		const publicConfig: ConfigPublic = {
			url: config.url,
			content: config.content,
		}
		expect(publicConfig.url.app).toBeDefined()
		expect(publicConfig.content.text.title).toBeDefined()
	})

	test('WebPieces type should be importable (compile-time)', () => {
		const piece: WebPieces = {
			id: '1',
			key: 'book-1',
			title: 'Test',
			slug: 'test',
			file_path: '/path',
			date_added: 0,
			type: 'book',
			json_metadata: '{}',
		}
		expect(piece.id).toBe('1')
	})

	test('WebPiecesAsset type should be importable (compile-time)', () => {
		const asset: WebPiecesAsset = {
			piece_file_path: '/path',
			piece_key: 'key',
			asset_key: 'asset-key',
			transformation: 'original',
			mime_type: 'image/png',
		}
		expect(asset.asset_key).toBe('asset-key')
	})

	test('WebPieceTags type should be importable (compile-time)', () => {
		const tag: WebPieceTags = {
			piece_slug: 'slug',
			piece_type: 'book',
			piece_id: '1',
			tag: 'fiction',
			slug: 'fiction',
		}
		expect(tag.tag).toBe('fiction')
	})
})
