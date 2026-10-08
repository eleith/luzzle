import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { Migrator, sql } from 'kysely'
import { createAppDb } from './client.js'
import { runWebMigrations } from './migrations.js'
import { migrations } from './migrations/index.js'

let db: ReturnType<typeof createAppDb>

beforeEach(() => {
	db = createAppDb(':memory:')
})

afterEach(async () => {
	await db.destroy()
})

function migrator() {
	return new Migrator({
		db,
		provider: { getMigrations: async () => migrations },
		migrationTableName: 'kysely_web_migrations',
		migrationLockTableName: 'kysely_web_migrations_lock'
	})
}

function piece(id: string) {
	return {
		id,
		key: `key-${id}`,
		title: id,
		slug: id,
		type: 'book',
		file_path: `${id}.book.md`,
		json_metadata: '{}',
		date_added: 1000,
		date_updated: 2000,
		content_hash: `hash-${id}`
	}
}

describe('web_pieces_date_added_index', () => {
	test('is created by migrating an app db to latest', async () => {
		expect((await runWebMigrations(db)).error).toBeUndefined()

		const rows = await sql<{ name: string }>`
			SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'web_pieces_date_added_index'
		`.execute(db)

		expect(rows.rows).toHaveLength(1)
	})
})

describe('web_pieces.last_published_at', () => {
	test('fresh schema accepts completion timestamps and leaves unset timestamps null', async () => {
		expect((await runWebMigrations(db)).error).toBeUndefined()
		await db
			.insertInto('web_pieces')
			.values([
				{ ...piece('published'), last_published_at: 1780000000123 },
				piece('legacy'),
				{ ...piece('explicit-null'), last_published_at: null }
			])
			.execute()

		const rows = await db
			.selectFrom('web_pieces')
			.select(['id', 'last_published_at'])
			.orderBy('id')
			.execute()

		expect(rows).toEqual([
			{ id: 'explicit-null', last_published_at: null },
			{ id: 'legacy', last_published_at: null },
			{ id: 'published', last_published_at: 1780000000123 }
		])
	})

	test('existing rows are not backfilled or changed when upgrading', async () => {
		expect(
			(await migrator().migrateTo('2026-09-15T00:00:00Z-add-web-pieces-content-hash')).error
		).toBeUndefined()
		await db.insertInto('web_pieces').values(piece('existing')).execute()
		const before = await db.selectFrom('web_pieces').selectAll().executeTakeFirstOrThrow()

		expect((await runWebMigrations(db)).error).toBeUndefined()
		const after = await db.selectFrom('web_pieces').selectAll().executeTakeFirstOrThrow()

		expect(after).toEqual({ ...before, last_published_at: null })

		await db
			.updateTable('web_pieces')
			.set({ last_published_at: 1780000000123 })
			.where('id', '=', 'existing')
			.execute()
		expect((await runWebMigrations(db)).error).toBeUndefined()
		expect(await db.selectFrom('web_pieces').selectAll().executeTakeFirstOrThrow()).toEqual({
			...before,
			last_published_at: 1780000000123
		})
	})

	test('down removes only the publication timestamp and preserves the row and indexes', async () => {
		expect((await runWebMigrations(db)).error).toBeUndefined()
		await db
			.insertInto('web_pieces')
			.values({ ...piece('existing'), last_published_at: 1780000000123 })
			.execute()
		const before = await db.introspection.getTables()
		const columns = before.find((table) => table.name === 'web_pieces')!.columns
		const indexesBefore = await sql<{ name: string }>`
			SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name
		`.execute(db)

		expect((await migrator().migrateDown()).error).toBeUndefined()
		const after = await db.introspection.getTables()
		expect(after.find((table) => table.name === 'web_pieces')!.columns).toEqual(
			columns.filter((column) => column.name !== 'last_published_at')
		)
		expect(await db.selectFrom('web_pieces').selectAll().executeTakeFirstOrThrow()).toMatchObject(
			piece('existing')
		)
		expect(
			await sql<{ name: string }>`
				SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name
			`.execute(db)
		).toEqual(indexesBefore)
	})
})
