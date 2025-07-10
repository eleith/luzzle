import { Kysely, sql } from 'kysely'
import {
	PiecesItemsInsertable,
	PiecesItemsUpdateable,
} from '../database/tables/pieces_items.schema.js'
import { LuzzleTables } from '../database/tables/index.js'

async function updateItem(db: Kysely<LuzzleTables>, file: string, data: PiecesItemsUpdateable) {
	await db.updateTable('pieces_items').set(data).where('file_path', '=', file).execute()
}

async function insertItem(db: Kysely<LuzzleTables>, data: PiecesItemsInsertable) {
	const insert = await db
		.insertInto('pieces_items')
		.values(data as never)
		.returningAll()
		.executeTakeFirst()

	return insert
}

async function selectItem(db: Kysely<LuzzleTables>, file?: string) {
	let query = db.selectFrom('pieces_items').selectAll()

	if (file) {
		query = query.where('file_path', '=', file)
	}

	return await query.executeTakeFirst()
}

async function selectItems(db: Kysely<LuzzleTables>, where?: { type?: string; asset?: string }) {
	let query = db
		.selectFrom('pieces_items')
		.select(['type', 'file_path', 'assets_json_array', 'id', 'date_added', 'date_updated'])

	if (where?.type) {
		query = query.where('type', '=', where.type)
	}

	if (where?.asset) {
		query = query.where('assets_json_array', 'like', `%${where.asset}%`)
	}

	return await query.execute()
}

async function selectItemAssets(db: Kysely<LuzzleTables>) {
	const select = sql<{
		asset: string
	}>`select distinct assets.value as asset from pieces_items, json_each(assets_json_array) assets where assets.value is not null`
	const query = select.compile(db)
	const results = await db.executeQuery(query)

	return results.rows.map((row) => row.asset)
}

async function deleteItems(db: Kysely<LuzzleTables>, files: string[]) {
	await db.deleteFrom('pieces_items').where('file_path', 'in', files).execute()
}

export { deleteItems, selectItem, selectItems, updateItem, insertItem, selectItemAssets }
