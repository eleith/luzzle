import { getDatabaseClient, Pieces, PieceSelectable } from '@luzzle/kysely'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { loadEnvConfig } from '@next/env'

const LastRunFile = '.generate-last-run'

async function getItems<T extends Pieces>(
	db: ReturnType<typeof getDatabaseClient>,
	lastRun: number,
	table: T
) {
	const items = await db
		.selectFrom(table as Pieces)
		.where((eb) =>
			eb.or([
				eb.and([eb.bxp('date_added', '>=', lastRun), eb.bxp('date_updated', 'is', null)]),
				eb.and([eb.bxp('date_updated', 'is not', null), eb.bxp('date_updated', '>=', lastRun)]),
			])
		)
		.selectAll()
		.execute()

	return items as PieceSelectable<T>[]
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

async function storeLastRun(variantsFolder: string, date: Date) {
	writeFileSync(`${variantsFolder}/${LastRunFile}`, date.toISOString())
}

async function initialize(folder: string) {
	loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

	const lastRun = await getLastRun(folder, new Date(0))
	const db = getDatabaseClient(`${process.env.LUZZLE_FOLDER}/luzzle.sqlite`)
	const luzzleFolder = `${process.env.LUZZLE_FOLDER}`

	return { lastRun, db, luzzleFolder }
}

async function finalize(folder: string, date: Date) {
	await storeLastRun(folder, date)
}

export { initialize, finalize, getItems }
