import type { Pieces } from '@luzzle/core'
import { getDatabase } from '../database.js'
import { type Config, type WebPieces, type WebPiecesAsset } from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { transforms } from './index.js'

export async function runTransformsForPiece(
	db: ReturnType<typeof getDatabase>,
	webPiece: WebPieces,
	config: Config,
	outDir: string,
	pieces: Pieces,
	options: { typeFilter?: string; dryRun?: boolean },
	assetKeyToPath: Map<string, string> = new Map()
): Promise<void> {
	const { typeFilter, dryRun = false } = options
	const webDb = db.withTables<{ web_pieces_assets: WebPiecesAsset }>()

	const selectedTransforms = typeFilter
		? [...transforms.entries()].filter(([name]) => name === typeFilter)
		: [...transforms.entries()]

	for (const [name, transform] of selectedTransforms) {
		if (!dryRun) {
			await webDb
				.deleteFrom('web_pieces_assets')
				.where('piece_file_path', '=', webPiece.file_path)
				.where('transformation', 'like', `${name}%`)
				.execute()
		}

		try {
			const records = await transform.run({ webPiece, config, outDir, pieces, assetKeyToPath })

			if (!dryRun && records.length > 0) {
				await webDb
					.insertInto('web_pieces_assets')
					.values(
						records.map((record) => ({
							content: record.content,
							is_embedded: record.is_embedded,
							transformation: record.transformation,
							mime_type: record.mime_type,
							asset_path: record.asset_path,
							piece_asset_path: record.piece_asset_path,
							piece_field_path: record.piece_field_path,
							piece_file_path: webPiece.file_path,
							piece_key: webPiece.key,
							asset_key: generateAssetKey(
								record.piece_asset_path || webPiece.file_path,
								config.assets.salt
							),
						}))
					)
					.execute()
			}

			for (const record of records) {
				const what = record.asset_path ?? `content of ${record.mime_type}`
				console.log(`[transform.${name}] generated ${what}`)
			}
		} catch (error) {
			console.error(`[transform.${name}] error for ${webPiece.file_path}: ${error}`)
		}
	}
}
