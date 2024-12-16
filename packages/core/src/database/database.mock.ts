import { vi, Mocked } from 'vitest'
import { LuzzleDatabase } from './tables/index.js'

function mockKysely() {
	const queries = {
		where: vi.fn().mockReturnThis(),
		whereRef: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		selectAll: vi.fn().mockReturnThis(),
		execute: vi.fn(),
		executeTakeFirst: vi.fn(),
		executeTakeFirstOrThrow: vi.fn(),
		set: vi.fn().mockReturnThis(),
		as: vi.fn(),
		values: vi.fn().mockReturnThis(),
		onConflict: vi.fn().mockReturnThis(),
		returning: vi.fn().mockReturnThis(),
		groupBy: vi.fn().mockReturnThis(),
		returningAll: vi.fn().mockReturnThis(),
	}

	const schema = {
		ifExists: vi.fn().mockReturnThis(),
		execute: vi.fn(),
	}

	const db = {
		selectFrom: vi.fn().mockImplementation(() => queries),
		deleteFrom: vi.fn().mockImplementation(() => queries),
		insertInto: vi.fn().mockImplementation(() => queries),
		executeQuery: vi.fn(),
		updateTable: vi.fn().mockImplementation(() => queries),
		schema: {
			createTable: vi.fn().mockImplementation(() => schema),
			dropTable: vi.fn().mockImplementation(() => schema),
		},
		fn: {
			count: vi.fn(() => ({
				as: queries.as,
			})),
		},
	} as unknown as Mocked<LuzzleDatabase>

	return { db, queries }
}

export { mockKysely }
