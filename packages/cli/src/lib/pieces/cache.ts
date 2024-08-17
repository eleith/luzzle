import { LuzzleDatabase } from '@luzzle/core'
import { createId } from '@paralleldrive/cuid2'
import { calculateHashFromFile } from './utils.js'

async function getCache(db: LuzzleDatabase, slug: string, name: string) {
	const cache = await db
		.selectFrom('pieces_cache')
		.selectAll()
		.where('slug', '=', slug)
		.where('type', '=', name)
		.executeTakeFirst()
	return cache || null
}

async function getCacheAll(db: LuzzleDatabase, name: string) {
	return await db.selectFrom('pieces_cache').selectAll().where('type', '=', name).execute()
}

async function addCache(
	db: LuzzleDatabase,
	slug: string,
	pieceName: string,
	file: string
): Promise<void> {
	const hash = await calculateHashFromFile(file)
	const id = createId()
	const date = new Date().getTime()

	await db
		.insertInto('pieces_cache')
		.values({
			slug,
			type: pieceName,
			content_hash: hash,
			id,
		})
		/* c8 ignore next 6 */
		.onConflict((oc) =>
			oc.columns(['slug', 'type']).doUpdateSet({
				content_hash: hash,
				date_updated: date,
			})
		)
		.execute()
}

async function updateCache(
	db: LuzzleDatabase,
	slug: string,
	pieceName: string,
	file: string
): Promise<void> {
	const hash = await calculateHashFromFile(file)
	const date = new Date().getTime()

	const id = await db
		.updateTable('pieces_cache')
		.set({ content_hash: hash, date_updated: date })
		.where('slug', '=', slug)
		.where('type', '=', pieceName)
		.returning('id')
		.executeTakeFirst()

	if (!id) {
		await addCache(db, slug, pieceName, file)
	}
}

async function removeCache(db: LuzzleDatabase, slug: string, name: string): Promise<void> {
	await db.deleteFrom('pieces_cache').where('slug', '=', slug).where('type', '=', name).execute()
}

async function clearCache(db: LuzzleDatabase, name: string): Promise<void> {
	await db.deleteFrom('pieces_cache').where('type', '=', name).execute()
}

export {
	calculateHashFromFile,
	getCacheAll,
	getCache,
	addCache,
	updateCache,
	removeCache,
	clearCache,
}
