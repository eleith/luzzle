import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { mockKysely } from '../database/database.mock.js'
import * as items from './items.js'
import { addColumnsFromPieceSchema } from './json.schema.js'
import { PiecesItemsTable } from 'src/database/tables/pieces_items.schema.js'

vi.mock('./json.schema.ts')

const mocks = {
	addColumnsFromPieceSchema: vi.mocked(addColumnsFromPieceSchema),
}

const spies: { [key: string]: MockInstance } = {}

describe('src/pieces/items.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('selectItem', async () => {
		const kysely = mockKysely()
		const slug = 'slug'

		await items.selectItem(kysely.db, 'test', slug)

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('slug', '=', slug)
	})

	test('updateItemById', async () => {
		const kysely = mockKysely()
		const id = 'one'
		const data = { slug: 'slug', title: 'title' }

		await items.updateItemById(kysely.db, 'test', id, data)

		expect(kysely.db.updateTable).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('id', '=', id)
	})

	test('insertItem', async () => {
		const kysely = mockKysely()
		const data = { slug: 'slug', type: 'books', id: 'one', frontmatter_json: '', note_markdown: '' }

		await items.insertItem(kysely.db, data)

		expect(kysely.db.insertInto).toHaveBeenCalled()
		expect(kysely.queries.values).toHaveBeenCalledWith(data)
	})

	test('selectItems', async () => {
		const kysely = mockKysely()

		await items.selectItems(kysely.db, 'test')

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(kysely.queries.selectAll).toHaveBeenCalled()
	})

	test('selectItems with columns', async () => {
		const kysely = mockKysely()
		const columns = ['slug', 'frontmatter_json'] as Array<keyof PiecesItemsTable>

		await items.selectItems(kysely.db, 'test', columns)

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(kysely.queries.select).toHaveBeenCalledWith(columns)
	})

	test('deleteItemsById', async () => {
		const kysely = mockKysely()
		const ids = ['slug1', 'slug2']

		await items.deleteItemsByIds(kysely.db, ids)

		expect(kysely.db.deleteFrom).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('id', 'in', ids)
	})
})
