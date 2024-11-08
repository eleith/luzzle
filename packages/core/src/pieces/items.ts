import { Kysely } from 'kysely'
import { PiecesItemsInsertable } from '../database/tables/pieces_items.schema.js'
import { LuzzleTables } from 'src/database/tables/index.js'

async function selectItem(db: Kysely<LuzzleTables>, pieceName: string, slug: string) {
	const query = await db
		.selectFrom('pieces_items')
		.selectAll()
		.where('slug', '=', slug)
		.where('type', '=', pieceName)
		.executeTakeFirst()

	return query
}

async function updateItemById(
	db: Kysely<LuzzleTables>,
	pieceName: string,
	id: string,
	data: { [key: string]: unknown }
) {
	await db
		.updateTable('pieces_items')
		.set(data as never)
		.where('id', '=', id)
		.where('type', '=', pieceName)
		.execute()
}

async function insertItem(db: Kysely<LuzzleTables>, data: PiecesItemsInsertable) {
	const insert = await db
		.insertInto('pieces_items')
		.values(data as never)
		.returningAll()
		.executeTakeFirst()

	return insert
}

async function selectItems(
	db: Kysely<LuzzleTables>,
	pieceName: string,
	columns?: Array<keyof PiecesItemsInsertable>
) {
	const query = db.selectFrom('pieces_items').where('type', '=', pieceName)

	if (columns) {
		const results = await query.select(columns).execute()
		return results
	} else {
		const results = await query.selectAll().execute()
		return results
	}
}

async function deleteItemsByIds(db: Kysely<LuzzleTables>, ids: string[]) {
	await db.deleteFrom('pieces_items').where('id', 'in', ids).execute()
}

export { selectItems, deleteItemsByIds, selectItem, updateItemById, insertItem }
