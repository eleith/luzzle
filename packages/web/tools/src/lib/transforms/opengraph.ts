import path from 'path'
import { getOpenGraphPath, type WebPieces, type WebPiecesAsset } from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { getBrowser, closeBrowser } from '../utils/browser.js'
import { generatePngFromUrl } from '../utils/png.js'
import type { TransformInput } from './types.js'

async function upsertAssetRecord(
	db: TransformInput['db'],
	record: WebPiecesAsset
) {
	await db
		.withTables<{ web_pieces_assets: WebPiecesAsset }>()
		.insertInto('web_pieces_assets')
		.values(record)
		.onConflict((oc) =>
			oc.columns(['piece_file_path', 'transformation', 'piece_asset_path']).doUpdateSet({
				asset_path: record.asset_path,
				mime_type: record.mime_type,
				is_embedded: record.is_embedded,
				content: record.content,
			})
		)
		.execute()
}

export async function run({ item, config, outDir, db }: TransformInput): Promise<void> {
	const webDb = db.withTables<{ web_pieces: WebPieces }>()
	const webPiece = await webDb
		.selectFrom('web_pieces')
		.select(['slug', 'key'])
		.where('file_path', '=', item.file_path)
		.executeTakeFirst()

	if (!webPiece) return

	const host = config.url.app
	const key = generateAssetKey(item.file_path, config.assets.salt)
	const ogPath = getOpenGraphPath(item.type, key)
	const outputPath = path.join(outDir, ogPath)
	const url = `${host}/api/pieces/${item.type}/${webPiece.slug}/opengraph?mode=local`

	try {
		const browser = await getBrowser()
		await generatePngFromUrl(url, browser, outputPath)

		await upsertAssetRecord(db, {
			piece_file_path: item.file_path,
			piece_key: key,
			transformation: 'opengraph',
			asset_path: ogPath,
			mime_type: 'image/png',
		})

		console.log(`[opengraph] generated for ${item.file_path}`)
	} catch (error) {
		console.error(`[error] opengraph for ${item.file_path}: ${error}`)
	}
}

export async function cleanup(): Promise<void> {
	await closeBrowser()
}
