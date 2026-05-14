import { Kysely } from 'kysely'
import type { Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import { generateAssetKey } from '../assets/key.js'
import { getTransforms } from './index.js'
import type { WebPieces, WebDatabase } from '../db.js'

export async function runTransformsForPiece(
	db: Kysely<WebDatabase>,
	webPiece: WebPieces,
	config: Config,
	outDir: string,
	pieces: Pieces,
	options: { typeFilter?: string; dryRun?: boolean },
	assetKeyToPath: Map<string, string>
): Promise<void> {
	const { typeFilter, dryRun = false } = options

	const transforms = getTransforms()
	const selectedTransforms = typeFilter
		? [...transforms.entries()].filter(([name]) => name === typeFilter)
		: [...transforms.entries()]

	for (const [name, transform] of selectedTransforms) {
		if (!dryRun) {
			await db
				.deleteFrom('web_pieces_assets')
				.where('piece_file_path', '=', webPiece.file_path)
				.where('transformation', 'like', `${name}%`)
				.execute()
		}

		try {
			const records = await transform.run({ webPiece, config, outDir, pieces, assetKeyToPath })

			if (!dryRun && records.length > 0) {
				await db
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
