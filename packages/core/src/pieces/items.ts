import { JSONSchemaType } from 'ajv'
import { Kysely } from 'kysely'
import { PieceFrontmatter } from './utils/frontmatter.js'
import { addColumnsFromPieceSchema } from './json.schema.js'
import { PiecesItemsInsertable, PiecesItemsSelectable } from './tables.schema.js'

function getPieceItemsTable<K>(name: string) {
	return `pieces_items_${name}` as keyof K & string
}

function dropPieceItemsTable<K>(db: Kysely<K>, name: string) {
	const tableName = getPieceItemsTable(name)
	return db.schema.dropTable(tableName).ifExists().execute()
}

async function createPieceItemsTable<K>(
	db: Kysely<K>,
	name: string,
	schema: JSONSchemaType<PieceFrontmatter>
) {
	const tableName = getPieceItemsTable(name)
	const tableBuilder = db.schema.createTable(tableName)
	const tableBuilderWithColumns = addColumnsFromPieceSchema(tableBuilder, schema)

	await tableBuilderWithColumns.execute()
}

async function selectItem<K>(db: Kysely<K>, pieceName: string, slug: string) {
	const tableName = getPieceItemsTable<K>(pieceName)
	const query = await db
		.selectFrom(tableName)
		.selectAll()
		.where('slug' as never, '=', slug as never)
		.executeTakeFirst()

	return (query || null) as unknown as PiecesItemsSelectable | null
}

async function updateItem<K>(
	db: Kysely<K>,
	pieceName: string,
	id: string,
	data: { [key: string]: unknown }
) {
	const tableName = getPieceItemsTable(pieceName)
	await db
		.updateTable(tableName)
		.set(data as never)
		.where('id' as never, '=', id as never)
		.execute()
}

async function insertItem<K, P extends PiecesItemsInsertable>(
	db: Kysely<K>,
	pieceName: string,
	data: P
) {
	const tableName = getPieceItemsTable(pieceName)

	const insert = await db
		.insertInto(tableName)
		.values(data as never)
		.returningAll()
		.executeTakeFirst()

	return insert as unknown as P
}

async function selectItems<P extends PiecesItemsSelectable, K>(
	db: Kysely<K>,
	name: string,
	columns?: Array<keyof P>
) {
	const tableName = getPieceItemsTable(name)
	const query = db.selectFrom(tableName)

	if (columns) {
		const results = await query.select(columns as never).execute()
		return results as unknown as P[]
	} else {
		const results = await query.selectAll().execute()
		return results as unknown as P[]
	}
}

async function deleteItems<K>(db: Kysely<K>, name: string, ids: string[]) {
	const tableName = getPieceItemsTable(name)

	await db
		.deleteFrom(tableName)
		.where('id' as never, 'IN' as never, ids as never)
		.execute()
}

export {
	getPieceItemsTable,
	dropPieceItemsTable,
	createPieceItemsTable,
	selectItems,
	deleteItems,
	selectItem,
	updateItem,
	insertItem,
}
