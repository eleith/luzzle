import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import * as manager from './manager.js'
import { makeSchema } from './Piece.fixtures.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { type LuzzleDatabase } from '../database/tables/index.js'

let db: LuzzleDatabase

beforeEach(async () => {
	db = await setupDatabase()
})

afterEach(async () => {
	await teardownDatabase(db)
})

describe('src/pieces/manager.ts', () => {
	test('addPiece inserts a managed piece', async () => {
		const schema = makeSchema()

		await manager.addPiece(db, 'books', schema)

		const piece = await manager.getPiece(db, 'books')
		expect(piece).toMatchObject({
			name: 'books',
			schema,
		})
	})

	test('updatePiece updates schema for existing piece', async () => {
		const schema = makeSchema()
		await manager.addPiece(db, 'books', schema)

		const updated = makeSchema({ rating: { type: 'number', nullable: true } })
		await manager.updatePiece(db, 'books', updated)

		const piece = await manager.getPiece(db, 'books')
		expect(piece!.schema).toEqual(updated)
	})

	test('getPiece returns piece with parsed schema', async () => {
		const schema = makeSchema()
		await manager.addPiece(db, 'books', schema)

		const piece = await manager.getPiece(db, 'books')

		expect(piece).not.toBeNull()
		expect(piece!.name).toBe('books')
		expect(piece!.schema).toEqual(schema)
	})

	test('getPiece returns null when not found', async () => {
		const piece = await manager.getPiece(db, 'missing')

		expect(piece).toBeNull()
	})

	test('getPieces returns all managed pieces', async () => {
		await manager.addPiece(db, 'books', makeSchema())
		await manager.addPiece(db, 'films', makeSchema())

		const pieces = await manager.getPieces(db)

		expect(pieces).toHaveLength(2)
	})

	test('deletePiece removes by name', async () => {
		await manager.addPiece(db, 'books', makeSchema())

		await manager.deletePiece(db, 'books')

		const piece = await manager.getPiece(db, 'books')
		expect(piece).toBeNull()
	})
})
