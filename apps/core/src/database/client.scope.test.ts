import { expect, expectTypeOf, test } from 'vitest'
import { asCoreDatabase, getDatabaseClient } from './client.js'
import migrate from './migrations.js'
import type { LuzzleDatabase } from './tables/index.js'

test('asCoreDatabase accepts an existing core client without replacing it', async () => {
	const db = getDatabaseClient(':memory:')
	try {
		const core = asCoreDatabase(db)
		expect(core).toBe(db)
		expectTypeOf(core).toEqualTypeOf<LuzzleDatabase>()
		// @ts-expect-error The input schema must contain all core tables.
		expectTypeOf(asCoreDatabase<{ application_items: { id: string } }>).toBeFunction()
	} finally {
		await db.destroy()
	}
})

test('asCoreDatabase shares the expanded client and its data, retaining app table access', async () => {
	const db = getDatabaseClient(':memory:').withTables<{ application_items: { id: string } }>()
	try {
		const core = asCoreDatabase(db)
		expect(core).toBe(db)
		expectTypeOf(core).toEqualTypeOf<LuzzleDatabase>()
		expect((await migrate(core)).error).toBeUndefined()
		await core
			.insertInto('pieces_cache')
			.values({ id: 'cache-id', file_path: 'books/test.books.md', content_hash: 'saved-hash' })
			.execute()
		expect(
			(await db.selectFrom('pieces_cache').selectAll().executeTakeFirstOrThrow()).content_hash
		).toBe('saved-hash')

		await db.schema.createTable('application_items').addColumn('id', 'text').execute()
		await db.insertInto('application_items').values({ id: 'app-id' }).execute()
		expect(await db.selectFrom('application_items').selectAll().execute()).toEqual([{ id: 'app-id' }])
	} finally {
		await db.destroy()
	}
})
