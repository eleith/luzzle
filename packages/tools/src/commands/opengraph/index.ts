import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { generateHtml } from './html.js'
import { generatePng } from './png.js'
import { getBrowser } from './browser.js'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import path from 'path'
import { getDatabaseClient } from '@luzzle/core'
import { loadConfig } from '../../lib/config/config.js'
import { getOpenGraphPath } from '../../lib/browser.js'
import { WebPieces } from '../sqlite/index.js'

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
	const operation = 'generate-open-graph'
	const lastRun = force ? new Date(0) : await getLastRunFor(outputDir, operation)

	const browser = await getBrowser()
	const storage = new StorageFileSystem(luzzle)
	const pieces = new Pieces(storage)
	const piecesToProcess = options.id ? items.filter((item) => item.id === options.id) : items

	for (const item of piecesToProcess) {
		const pieceModifiedTime = new Date(item.date_updated || item.date_added)

		if (pieceModifiedTime > lastRun || force || options.id) {
			try {
				const ogPath = getOpenGraphPath(item.type, item.id)
				const outputPath = path.join(outputDir, ogPath)
				const html = await generateHtml(item, pieces, config)

				if (html) {
					await generatePng(html, browser, outputPath)
				} else {
					console.warn(`Skipped making opengraph for ${item.file_path} (${item.id}): no opengraph svelte component found.`)
				}
			} catch (e) {
				console.error(`Error making opengraph for ${item.file_path} (${item.id}): ${e}`)
			}
		}
	}

	if (!options.id) {
		await setLastRunFor(outputDir, operation, new Date())
	}

	await browser.close()
}
