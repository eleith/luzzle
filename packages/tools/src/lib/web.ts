import { getDatabaseClient } from '@luzzle/core'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const LastRunFile = '.generate-last-run'

const WebPieceTypes = ['books', 'links', 'texts', 'games'] as const
const WebPieceTypesRegExp = RegExp(WebPieceTypes.join('|'))

type WebPieceType = (typeof WebPieceTypes)[number]

interface WebPieces {
	id: string
	title: string
	slug: string
	note: string
	date_updated: number
	date_added: number
	date_consumed: number
	type: WebPieceType
	media: string
	json_metadata: string
	summary: string
}

function getDatabase(db: string) {
	const coreDatabase = getDatabaseClient(db)

	return coreDatabase.withTables<{
		web_pieces: WebPieces
	}>()
}

async function getItemsSince(
	db: ReturnType<typeof getDatabase>,
	lastRun: number,
	type?: WebPieceType
) {
	const query = db
		.selectFrom('web_pieces')
		.where((eb) =>
			eb.or([
				eb.and([eb('date_added', '>=', lastRun), eb('date_updated', 'is', null)]),
				eb.and([eb('date_updated', 'is not', null), eb('date_updated', '>=', lastRun)]),
			])
		)
		.selectAll()

	if (type) {
		return await query.where('type', '=', type).execute()
	} else {
		return await query.execute()
	}
}

function getItemMetadata<T>(item: WebPieces): T {
	const metadata = item.json_metadata ? JSON.parse(item.json_metadata) : {}
	return metadata as T
}

async function getLastRun(variantsFolder: string, defaultDate = new Date(0)) {
	try {
		if (!existsSync(`${variantsFolder}/${LastRunFile}`) === false) {
			const lastRun = readFileSync(`${variantsFolder}/${LastRunFile}`, 'utf-8')
			const lastRunDate = new Date(lastRun)

			if (!isNaN(lastRunDate as unknown as number)) {
				console.log(`last run: ${lastRunDate.toISOString()}`)
				return lastRunDate.getTime()
			}
		}

		throw new Error('Invalid date')
	} catch (e) {
		return defaultDate.getTime()
	}
}

async function setLastRun(variantsFolder: string, date: Date) {
	writeFileSync(`${variantsFolder}/${LastRunFile}`, date.toISOString())
}

export {
	getItemsSince,
	getLastRun,
	setLastRun,
	getDatabase,
	getItemMetadata,
	WebPieceTypes,
	WebPieceTypesRegExp,
	type WebPieces,
	type WebPieceType,
}
