import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { mockKysely } from '../database/database.mock.js'
import * as items from './items.js'
import { addColumnsFromPieceSchema } from './json.schema.js'
import { RawBuilder, sql } from 'kysely'

vi.mock('./json.schema.ts')
vi.mock('kysely')

const mocks = {
	addColumnsFromPieceSchema: vi.mocked(addColumnsFromPieceSchema),
	sql: vi.mocked(sql),
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
		const file = 'file'

		await items.selectItem(kysely.db, file)

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('file_path', '=', file)
	})

	test('updateItem', async () => {
		const kysely = mockKysely()
		const file = 'file'
		const data = { id: 'id', title: 'title' }

		await items.updateItem(kysely.db, file, data)

		expect(kysely.db.updateTable).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('file_path', '=', file)
	})

	test('insertItem', async () => {
		const kysely = mockKysely()
		const data = {
			file_path: 'path',
			type: 'books',
			id: 'one',
			frontmatter_json: '',
			note_markdown: '',
		}

		await items.insertItem(kysely.db, data)

		expect(kysely.db.insertInto).toHaveBeenCalled()
		expect(kysely.queries.values).toHaveBeenCalledWith(data)
	})

	test('selectItems', async () => {
		const kysely = mockKysely()
		await items.selectItems(kysely.db)

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(kysely.queries.where).not.toHaveBeenCalled()
		expect(kysely.queries.select).toHaveBeenCalledOnce()
	})

	test('selectItems with type', async () => {
		const kysely = mockKysely()
		const type = 'books'
		await items.selectItems(kysely.db, { type })

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('type', '=', type)
		expect(kysely.queries.select).toHaveBeenCalledOnce()
	})

	test('selectItems with asset', async () => {
		const kysely = mockKysely()
		const asset = 'file1'
		await items.selectItems(kysely.db, { asset })

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith(
			'assets_json_array',
			'like',
			expect.any(String)
		)
		expect(kysely.queries.select).toHaveBeenCalledOnce()
	})

	test('selectItemAssets', async () => {
		const kysely = mockKysely()
		const asset = 'file1'

		mocks.sql.mockReturnValueOnce({ compile: vi.fn() } as unknown as RawBuilder<unknown>)
		spies.executeQuery = vi
			.spyOn(kysely.db, 'executeQuery')
			.mockResolvedValue({ rows: [{ asset }] })

		const assets = await items.selectItemAssets(kysely.db)

		expect(kysely.db.executeQuery).toHaveBeenCalled()
		expect(assets).toEqual([asset])
	})

	test('deleteItems', async () => {
		const kysely = mockKysely()
		const files = ['file1', 'file2']

		await items.deleteItems(kysely.db, files)

		expect(kysely.db.deleteFrom).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('file_path', 'in', files)
	})
})
