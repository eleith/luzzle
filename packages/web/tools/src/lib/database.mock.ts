import { vi } from 'vitest'
import { LuzzleDatabase } from '@luzzle/core'

export function mockKysely() {
	const queries = {
		where: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		selectAll: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue([]),
		executeTakeFirst: vi.fn().mockResolvedValue(undefined),
		values: vi.fn().mockReturnThis(),
		onConflict: vi.fn().mockImplementation((cb?: (oc: unknown) => unknown) => {
			/* v8 ignore next 5*/
			if (cb) {
				const oc = { columns: vi.fn().mockReturnThis(), doUpdateSet: vi.fn().mockReturnThis() }
				cb(oc)
			}
			return queries
		}),
		deleteFrom: vi.fn().mockReturnThis(),
		insertInto: vi.fn().mockReturnThis(),
		returning: vi.fn().mockReturnThis(),
	}

	const db = {
		selectFrom: vi.fn().mockReturnValue(queries),
		deleteFrom: vi.fn().mockReturnValue(queries),
		insertInto: vi.fn().mockReturnValue(queries),
		updateTable: vi.fn().mockReturnValue(queries),
		withTables: vi.fn().mockReturnThis(),
		schema: {
			createTable: vi.fn().mockReturnValue(queries),
			dropTable: vi.fn().mockReturnValue(queries),
		},
	} as unknown as LuzzleDatabase

	return { db, queries }
}
