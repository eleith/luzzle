import { getLastRunFor, setLastRunFor } from '../lib/lastRun.js'
import { mkdir, writeFile } from 'fs/promises'
import { generateHtml } from './opengraph/html.js'
import { generatePng } from './opengraph/png.js'
import { getBrowser } from './opengraph/browser.js'
import { Browser } from 'puppeteer'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import path from 'path'
import { getDatabaseClient, LuzzleSelectable } from '@luzzle/core'
import { loadConfig } from '../lib/config-loader.js'

async function generateOpenGraphForMarkdown(
	item: LuzzleSelectable<'pieces_items'>,
	pieces: Pieces,
	browser: Browser,
	output: string,
	template: string,
) {
	try {
		console.log(`generating opengraph for ${output}`)

		const html = await generateHtml(item, pieces, template)
		const png = await generatePng(html, browser)
		const ogDir = path.dirname(output)

		await mkdir(ogDir, { recursive: true })
		await writeFile(output, png)
	} catch (e) {
		console.error(`Error generating Open Graph for ${output}: ${e}`)
	}
}

export async function generateOpenGraphs(
	configPath: string,
	luzzle: string,
	outputDir: string,
	template: string,
	options: { force?: boolean; limit?: number }
) {
	const config = loadConfig({ userConfigPath: configPath })
	const db = getDatabaseClient(config.paths.database)
	const items = await db
		.selectFrom('pieces_items')
		.selectAll()
		.orderBy('date_updated', 'desc')
		.orderBy('type', 'asc')
		.execute()

	const force = options.force || false
	const limit = options.limit || Infinity
	const operation = 'generate-open-graph'
	const lastRun = force ? new Date(0) : await getLastRunFor(outputDir, operation)
	const piecesToProcess = limit === Infinity ? items : items.slice(0, limit)

	const browser = await getBrowser()
	const storage = new StorageFileSystem(luzzle)
	const pieces = new Pieces(storage)

	for (const item of piecesToProcess) {
		const pieceModifiedTime = new Date(item.date_updated || item.date_added)

		if (pieceModifiedTime > lastRun || force) {
			const pieceType = item.type
			const pieceId = item.id
			const output = `${outputDir}/${pieceType}/${pieceId}/opengraph.png`

			await generateOpenGraphForMarkdown(item, pieces, browser, output, template)
		}
	}

	if (!force && (limit === Infinity || !limit)) {
		await setLastRunFor(outputDir, operation, new Date())
	}

	await browser.close()
}
