import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { mockKysely } from '../database/database.mock.js'
import * as items from './items.js'
import { addColumnsFromPieceSchema } from './json.schema.js'
import { makeSchema } from './utils/piece.fixtures.js'

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

	test('dropPieceItemsTable', async () => {
		const kysely = mockKysely()

		await items.dropPieceItemsTable(kysely.db, 'test')

		expect(kysely.db.schema.dropTable).toHaveBeenCalled()
	})

	test('createPieceItemsTable', async () => {
		const kysely = mockKysely()
		const schema = makeSchema()

		mocks.addColumnsFromPieceSchema.mockImplementation((tableBuilder) => tableBuilder)

		await items.createPieceItemsTable(kysely.db, 'test', schema)

		expect(kysely.db.schema.createTable).toHaveBeenCalled()
		expect(mocks.addColumnsFromPieceSchema).toHaveBeenCalledWith(expect.any(Object), schema)
	})

	test('selectItem', async () => {
		const kysely = mockKysely()
		const slug = 'slug'

		await items.selectItem(kysely.db, 'test', slug)

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('slug', '=', slug)
	})

	test('updateItem', async () => {
		const kysely = mockKysely()
		const id = 'one'
		const data = { slug: 'slug', title: 'title' }

		await items.updateItem(kysely.db, 'test', id, data)

		expect(kysely.db.updateTable).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('id', '=', id)
	})

	test('insertItem', async () => {
		const kysely = mockKysely()
		const data = { slug: 'slug', title: 'title' }

		await items.insertItem(kysely.db, 'test', data)

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
		const columns = ['column1', 'column2']

		await items.selectItems(kysely.db, 'test', columns)

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(kysely.queries.select).toHaveBeenCalledWith(columns)
	})

	test('deleteItems', async () => {
		const kysely = mockKysely()
		const slugs = ['slug1', 'slug2']

		await items.deleteItems(kysely.db, 'test', slugs)

		expect(kysely.db.deleteFrom).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('id', 'in', slugs)
	})
})
