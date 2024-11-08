import { Kysely } from 'kysely'
import { LuzzleTables } from '../database/tables/index.js'
import { JSONSchemaType } from 'ajv'
import { PieceFrontmatter } from './utils/frontmatter.js'
import cuid2 from '@paralleldrive/cuid2'

async function addPiece(
	db: Kysely<LuzzleTables>,
	name: string,
	schema: JSONSchemaType<PieceFrontmatter>
) {
	await db
		.insertInto('pieces_manager')
		.values({
			name,
			schema: JSON.stringify(schema),
			id: cuid2.createId(),
		})
		.execute()
}

async function updatePiece(
	db: Kysely<LuzzleTables>,
	name: string,
	schema: JSONSchemaType<PieceFrontmatter>
) {
	await db
		.updateTable('pieces_manager')
		.set({
			schema: JSON.stringify(schema),
			date_updated: new Date().getTime(),
		})
		.where('name', '=', name)
		.execute()
}

async function getPiece(db: Kysely<LuzzleTables>, name: string) {
	const managedPiece = await db
		.selectFrom('pieces_manager')
		.selectAll()
		.where('name', '=', name)
		.executeTakeFirst()

	if (managedPiece) {
		return {
			...managedPiece,
			schema: JSON.parse(managedPiece.schema) as JSONSchemaType<PieceFrontmatter>,
		}
	}

	return null
}

async function getPieces(db: Kysely<LuzzleTables>) {
	const pieces = await db.selectFrom('pieces_manager').selectAll().execute()
	return pieces
}

async function deletePiece(db: Kysely<LuzzleTables>, name: string) {
	await db.deleteFrom('pieces_manager').where('name', '=', name).execute()
}

export { addPiece, updatePiece, getPiece, deletePiece, getPieces }
