import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import * as items from './items.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { type LuzzleDatabase } from '../database/tables/index.js'

let db: LuzzleDatabase

beforeEach(async () => {
	db = await setupDatabase()
})

afterEach(async () => {
	await teardownDatabase(db)
})

const itemData = {
	file_path: 'book.md',
	type: 'books',
	id: 'item1',
	frontmatter_json: '{"title":"My Book"}',
	note_markdown: '# My Book',
}

describe('src/pieces/items.ts', () => {
	test('insertItem inserts and returns the item', async () => {
		const result = await items.insertItem(db, itemData)

		expect(result).toMatchObject({
			file_path: 'book.md',
			type: 'books',
			note_markdown: '# My Book',
		})
	})

	test('selectItem returns item by file_path', async () => {
		await items.insertItem(db, itemData)

		const result = await items.selectItem(db, 'book.md')

		expect(result).toMatchObject({
			file_path: 'book.md',
			type: 'books',
		})
	})

	test('selectItem returns undefined when not found', async () => {
		const result = await items.selectItem(db, 'missing.md')

		expect(result).toBeUndefined()
	})

	test('updateItem updates by file_path', async () => {
		await items.insertItem(db, itemData)

		await items.updateItem(db, 'book.md', { note_markdown: '# Updated' })

		const result = await items.selectItem(db, 'book.md')
		expect(result!.note_markdown).toBe('# Updated')
	})

	test('selectItems returns all items', async () => {
		await items.insertItem(db, itemData)
		await items.insertItem(db, { ...itemData, file_path: 'film.md', type: 'films', id: 'item2' })

		const result = await items.selectItems(db)

		expect(result).toHaveLength(2)
	})

	test('selectItems filters by type', async () => {
		await items.insertItem(db, itemData)
		await items.insertItem(db, { ...itemData, file_path: 'film.md', type: 'films', id: 'item2' })

		const result = await items.selectItems(db, { type: 'books' })

		expect(result).toHaveLength(1)
		expect(result[0].file_path).toBe('book.md')
	})

	test('selectItems filters by asset', async () => {
		await items.insertItem(db, {
			...itemData,
			assets_json_array: JSON.stringify(['poster.jpg', 'cover.png']),
		})
		await items.insertItem(db, { ...itemData, file_path: 'film.md', type: 'films', id: 'item2' })

		const result = await items.selectItems(db, { asset: 'poster.jpg' })

		expect(result).toHaveLength(1)
		expect(result[0].file_path).toBe('book.md')
	})

	test('selectItemAssets returns distinct assets across all items', async () => {
		await items.insertItem(db, {
			...itemData,
			assets_json_array: JSON.stringify(['poster.jpg', 'cover.png']),
		})
		await items.insertItem(db, {
			...itemData,
			file_path: 'film.md',
			type: 'films',
			id: 'item2',
			assets_json_array: JSON.stringify(['poster.jpg', 'trailer.mp4']),
		})

		const assets = await items.selectItemAssets(db)

		expect(assets).toHaveLength(3)
		expect(assets.sort()).toEqual(['cover.png', 'poster.jpg', 'trailer.mp4'])
	})

	test('selectItemAssets returns empty when no assets', async () => {
		await items.insertItem(db, itemData)

		const assets = await items.selectItemAssets(db)

		expect(assets).toHaveLength(0)
	})

	test('deleteItem removes by file_path', async () => {
		await items.insertItem(db, itemData)

		await items.deleteItem(db, 'book.md')

		const result = await items.selectItem(db, 'book.md')
		expect(result).toBeUndefined()
	})

	test('deleteItems removes multiple by file_path', async () => {
		await items.insertItem(db, itemData)
		await items.insertItem(db, { ...itemData, file_path: 'film.md', type: 'films', id: 'item2' })

		await items.deleteItems(db, ['book.md', 'film.md'])

		const result = await items.selectItems(db)
		expect(result).toHaveLength(0)
	})
})
