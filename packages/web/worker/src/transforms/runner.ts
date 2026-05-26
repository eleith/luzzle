import { Kysely } from 'kysely'
import type { Pieces } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import { generateAssetKey } from '../assets/key.js'
import { getTransforms } from './index.js'
import type { WebPieces, WebDatabase } from '../services/db.js'
import type { Logger } from '../services/logger.js'
import type { AssetRecord } from './utils/types.js'

export type ProducedTransform = {
	name: string
	records: AssetRecord[]
}

export type ProduceOptions = {
	typeFilter?: string
}

export async function produceTransformsForPiece(
	webPiece: WebPieces,
	config: Config,
	outDir: string,
	pieces: Pieces,
	options: ProduceOptions,
	assetKeyToPath: Map<string, string>,
	logger: Logger
): Promise<ProducedTransform[]> {
	const { typeFilter } = options
	const transforms = getTransforms()
	const selected = typeFilter
		? [...transforms.entries()].filter(([name]) => name === typeFilter)
		: [...transforms.entries()]

	const produced: ProducedTransform[] = []
	const priorAssets: PublicWebPieceAsset[] = []

	for (const [name, transform] of selected) {
		try {
			const records = await transform.run({
				webPiece,
				config,
				outDir,
				pieces,
				assetKeyToPath,
				logger,
				priorAssets,
			})
			produced.push({ name, records })

			for (const record of records) {
				const what = record.asset_path ?? `content of ${record.mime_type}`
				logger.info(`transform.${name} generated ${what}`)

				priorAssets.push({
					asset_key: generateAssetKey(
						record.piece_asset_path || webPiece.file_path,
						config.assets.salt
					),
					transformation: record.transformation,
					asset_path: record.asset_path,
					mime_type: record.mime_type,
					is_embedded: record.is_embedded,
					content: record.content,
				})
			}
		} catch (error) {
			logger.error(`transform.${name} error for ${webPiece.file_path}`, {
				error: error instanceof Error ? error.message : String(error),
			})
			produced.push({ name, records: [] })
		}
	}

	return produced
}

export async function persistTransforms(
	db: Kysely<WebDatabase>,
	webPiece: WebPieces,
	config: Config,
	produced: ProducedTransform[]
): Promise<void> {
	for (const { name, records } of produced) {
		await db
			.deleteFrom('web_pieces_assets')
			.where('piece_file_path', '=', webPiece.file_path)
			.where('transformation', 'like', `${name}%`)
			.execute()

		if (records.length === 0) continue

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
}

export async function runTransformsForPiece(
	db: Kysely<WebDatabase>,
	webPiece: WebPieces,
	config: Config,
	outDir: string,
	pieces: Pieces,
	options: { typeFilter?: string; dryRun?: boolean },
	assetKeyToPath: Map<string, string>,
	logger: Logger
): Promise<void> {
	const produced = await produceTransformsForPiece(
		webPiece,
		config,
		outDir,
		pieces,
		{ typeFilter: options.typeFilter },
		assetKeyToPath,
		logger
	)

	if (!options.dryRun) {
		await persistTransforms(db, webPiece, config, produced)
	}
}
