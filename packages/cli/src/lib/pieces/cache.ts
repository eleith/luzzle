import { LuzzleDatabase, Pieces } from '@luzzle/kysely'
import { createId } from '@paralleldrive/cuid2'
import { calculateHashFromFile } from './utils.js'

async function getCache(db: LuzzleDatabase, slug: string, type: Pieces) {
	const cache = await db
		.selectFrom('pieces_cache')
		.selectAll()
		.where('slug', '=', slug)
		.where('type', '=', type)
		.executeTakeFirst()
	return cache || null
}

async function getCacheAll(db: LuzzleDatabase, type: Pieces) {
	return await db.selectFrom('pieces_cache').selectAll().where('type', '=', type).execute()
}

async function addCache(
	db: LuzzleDatabase,
	slug: string,
	type: Pieces,
	file: string
): Promise<void> {
	const hash = await calculateHashFromFile(file)
	const id = createId()
	const date = new Date().getTime()

	await db
		.insertInto('pieces_cache')
		.values({
			slug,
			type,
			content_hash: hash,
			id,
		})
		.onConflict((oc) =>
			oc.columns(['slug', 'type']).doUpdateSet({ content_hash: hash, date_updated: date })
		)
		.execute()
}

async function updateCache(
	db: LuzzleDatabase,
	slug: string,
	type: Pieces,
	file: string
): Promise<void> {
	const hash = await calculateHashFromFile(file)
	const date = new Date().getTime()

	const id = await db
		.updateTable('pieces_cache')
		.set({ content_hash: hash, date_updated: date })
		.where('slug', '=', slug)
		.where('type', '=', type)
		.returning('id')
		.executeTakeFirst()

	if (!id) {
		await addCache(db, slug, type, file)
	}
}

async function removeCache(db: LuzzleDatabase, slug: string, type: Pieces): Promise<void> {
	await db.deleteFrom('pieces_cache').where('slug', '=', slug).where('type', '=', type).execute()
}

export { calculateHashFromFile, getCacheAll, getCache, addCache, updateCache, removeCache }
