import { LuzzleDatabase } from '@luzzle/core'
import { createId } from '@paralleldrive/cuid2'
import { calculateHashFromFile } from './utils.js'

async function getCache(db: LuzzleDatabase, file: string) {
	const cache = await db
		.selectFrom('pieces_cache')
		.selectAll()
		.where('file_path', '=', file)
		.executeTakeFirst()
	return cache || null
}

async function getCacheAll(db: LuzzleDatabase) {
	return await db.selectFrom('pieces_cache').selectAll().execute()
}

async function addCache(db: LuzzleDatabase, file: string, hash: string): Promise<void> {
	const id = createId()
	const date = new Date().getTime()

	await db
		.insertInto('pieces_cache')
		.values({
			content_hash: hash,
			file_path: file,
			id,
		})
		/* c8 ignore next 6 */
		.onConflict((oc) =>
			oc.columns(['file_path']).doUpdateSet({
				content_hash: hash,
				date_updated: date,
			})
		)
		.execute()
}

async function updateCache(db: LuzzleDatabase, file: string, hash: string): Promise<void> {
	const date = new Date().getTime()

	const id = await db
		.updateTable('pieces_cache')
		.set({ content_hash: hash, date_updated: date })
		.where('file_path', '=', file)
		.returning('id')
		.executeTakeFirst()

	if (!id) {
		await addCache(db, file, hash)
	}
}

async function removeCache(db: LuzzleDatabase, file: string): Promise<void> {
	await db.deleteFrom('pieces_cache').where('file_path', '=', file).execute()
}

async function clearCache(db: LuzzleDatabase): Promise<void> {
	await db.deleteFrom('pieces_cache').execute()
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
