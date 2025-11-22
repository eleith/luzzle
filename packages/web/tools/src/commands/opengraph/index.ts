import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { generatePngFromUrl } from './png.js'
import { getBrowser } from './browser.js'
import path from 'path'
import { getDatabaseClient } from '@luzzle/core'
import { loadConfig } from '@luzzle/web.utils/server'
import { type WebPieces, getOpenGraphPath } from '@luzzle/web.utils'

export default async function generateOpenGraphs(
	configPath: string,
	luzzle: string,
	outputDir: string,
	options: { force?: boolean; id?: string }
) {
	const config = loadConfig(configPath)
	const configDir = path.dirname(configPath)
	const dbPath = path.join(configDir, config.paths.database)
	const db = getDatabaseClient(dbPath)
	const items = await db
		.withTables<{ web_pieces: WebPieces }>()
		.selectFrom('web_pieces')
		.selectAll()
		.orderBy('date_updated', 'desc')
		.orderBy('type', 'asc')
		.execute()

	const force = options.force || false
	const id = options.id || null
	const operation = 'generate-open-graph'
	const lastRun = force ? new Date(0) : await getLastRunFor(outputDir, operation)

	const browser = await getBrowser()
	const piecesToProcess = id ? items.filter((item) => item.id === id) : items

	for (const item of piecesToProcess) {
		const pieceModifiedTime = new Date(item.date_updated || item.date_added)

		if (pieceModifiedTime > lastRun || force || id) {
			try {
				const ogPath = getOpenGraphPath(item.type, item.id)
				const outputPath = path.join(outputDir, ogPath)
				const url = `${config.url.app}/api/pieces/${item.type}/${item.slug}/opengraph`
				await generatePngFromUrl(url, browser, outputPath)

				console.log(`generated opengraph for ${item.file_path} (${item.id})`)
			} catch (e) {
				console.log(luzzle)
				console.error(`error making opengraph for ${item.file_path} (${item.id}): ${e}`)
			}
		}
	}

	if (!id) {
		await setLastRunFor(outputDir, operation, new Date())
	}

	await browser.close()
}
