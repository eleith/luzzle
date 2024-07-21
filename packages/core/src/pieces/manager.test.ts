import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { mockKysely } from '../database/database.mock.js'
import { createPieceItemsTable, dropPieceItemsTable } from './items.js'
import * as manager from './manager.js'
import { makeSchema } from './utils/piece.fixtures.js'

vi.mock('./items.js')

const mocks = {
	dropPieceItemsTable: vi.mocked(dropPieceItemsTable),
	createPieceItemsTable: vi.mocked(createPieceItemsTable),
}

const spies: { [key: string]: MockInstance } = {}

describe('src/pieces/manager.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('addPiece', async () => {
		const kysely = mockKysely()
		const schema = makeSchema()

		mocks.createPieceItemsTable.mockResolvedValueOnce()

		await manager.addPiece(kysely.db, 'name', schema)

		expect(mocks.createPieceItemsTable).toHaveBeenCalled()
		expect(kysely.db.insertInto).toHaveBeenCalled()
	})

	test('updatePiece', async () => {
		const kysely = mockKysely()
		const schema = makeSchema()
		const name = 'name'

		mocks.createPieceItemsTable.mockResolvedValueOnce()
		mocks.dropPieceItemsTable.mockResolvedValueOnce()

		await manager.updatePiece(kysely.db, name, schema)

		expect(mocks.createPieceItemsTable).toHaveBeenCalled()
		expect(mocks.dropPieceItemsTable).toHaveBeenCalled()
		expect(kysely.db.updateTable).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('name', '=', name)
	})

	test('getPiece', async () => {
		const kysely = mockKysely()
		const name = 'name'
		const schema = makeSchema()
		const managedPiece = {
			name,
			schema: JSON.stringify(schema),
		}

		kysely.queries.executeTakeFirst.mockResolvedValueOnce(managedPiece)

		const piece = await manager.getPiece(kysely.db, name)

		expect(piece).toEqual({
			...managedPiece,
			schema,
		})
	})

	test('getPiece returns null', async () => {
		const kysely = mockKysely()
		const name = 'name'

		kysely.queries.executeTakeFirst.mockResolvedValueOnce(undefined)

		const piece = await manager.getPiece(kysely.db, name)

		expect(piece).toBeNull()
	})

	test('getPieces', async () => {
		const kysely = mockKysely()
		const managedPieces = [{ name: 'name' }]

		kysely.queries.execute.mockResolvedValueOnce(managedPieces)

		const pieces = await manager.getPieces(kysely.db)

		expect(kysely.db.selectFrom).toHaveBeenCalled()
		expect(pieces).toEqual(managedPieces)
	})

	test('deletePiece', async () => {
		const kysely = mockKysely()
		const name = 'name'

		mocks.dropPieceItemsTable.mockResolvedValueOnce()

		await manager.deletePiece(kysely.db, name)

		expect(mocks.dropPieceItemsTable).toHaveBeenCalled()
		expect(kysely.db.deleteFrom).toHaveBeenCalled()
		expect(kysely.queries.where).toHaveBeenCalledWith('name', '=', name)
	})
})
