import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { generatePngFromUrl } from './png.js'
import { getBrowser } from './browser.js'
import path from 'path'
import { type WebPieces, getOpenGraphPath, type Config, type WebPiecesAsset } from '@luzzle/web.utils'
import { getDatabase } from '../../lib/database.js'

async function upsertAssetRecord(
	db: ReturnType<typeof getDatabase>,
	record: WebPiecesAsset
) {
	await db
		.withTables<{ web_pieces_assets: WebPiecesAsset }>()
		.insertInto('web_pieces_assets')
		.values(record)
		.onConflict((oc) =>
			oc.columns(['piece_file_path', 'transformation']).doUpdateSet({
				asset_path: record.asset_path,
				mime_type: record.mime_type,
				is_embedded: record.is_embedded,
				content: record.content,
			})
		)
		.execute()
}

type GenerateOpenGraphsOptions = {
	outputDir: string
	force?: boolean
	host?: string
	id?: string
}

export default async function generateOpenGraphs(
	options: GenerateOpenGraphsOptions,
	config: Config
) {
	const db = getDatabase(config)
	const host = options.host || config.url.app
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
	const lastRun = force ? new Date(0) : await getLastRunFor(options.outputDir, operation)

	const browser = await getBrowser()
	const piecesToProcess = id ? items.filter((item) => item.id === id) : items

	for (const item of piecesToProcess) {
		const pieceModifiedTime = new Date(item.date_updated || item.date_added)

		if (pieceModifiedTime > lastRun || force || id) {
			try {
				const ogPath = getOpenGraphPath(item.type, item.key)
				const outputPath = path.join(options.outputDir, ogPath)
				const url = `${host}/api/pieces/${item.type}/${item.slug}/opengraph?mode=local`
				await generatePngFromUrl(url, browser, outputPath)

				await upsertAssetRecord(db, {
					piece_file_path: item.file_path,
					piece_key: item.key,
					transformation: 'opengraph',
					asset_path: ogPath,
					mime_type: 'image/png',
					is_embedded: false,
				})

				console.log(`generated opengraph for ${item.file_path} (${item.key})`)
			} catch (e) {
				console.error(`error making opengraph for ${item.file_path} (${item.key}): ${e}`)
			}
		}
	}

	if (!id) {
		await setLastRunFor(options.outputDir, operation, new Date())
	}

	await browser.close()
}
