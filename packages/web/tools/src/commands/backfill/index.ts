import { getDatabase, getDatabaseAndMigrate } from '../../lib/database.js'
import { type Config, type WebPieces, type WebPiecesAsset } from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import runWebMigrations from '../../database/migrations.js'

export function sanitizeMetadata(jsonMetadata: string, pathToKey: Map<string, string>): string {
	if (pathToKey.size === 0) return jsonMetadata
	return JSON.stringify(
		JSON.parse(jsonMetadata, (_key, value) => {
			if (typeof value === 'string' && pathToKey.has(value)) {
				return pathToKey.get(value)
			}
			return value
		})
	)
}

export async function backfillAssetKeys(
	db: ReturnType<typeof getDatabase>,
	config: Config
): Promise<number> {
	const webDb = db.withTables<{ web_pieces_assets: WebPiecesAsset }>()

	const rows = await webDb
		.selectFrom('web_pieces_assets')
		.selectAll()
		.where('asset_key', '=', '')
		.execute()

	for (const row of rows) {
		const source = row.piece_asset_path || row.piece_file_path
		const assetKey = generateAssetKey(source, config.assets.salt)

		await webDb
			.updateTable('web_pieces_assets')
			.set({ asset_key: assetKey })
			.where('piece_file_path', '=', row.piece_file_path)
			.where('transformation', '=', row.transformation)
			.where('piece_asset_path', '=', row.piece_asset_path)
			.execute()
	}

	return rows.length
}

export async function backfillSanitizeMetadata(
	db: ReturnType<typeof getDatabase>
): Promise<number> {
	const webDb = db.withTables<{
		web_pieces: WebPieces
		web_pieces_assets: WebPiecesAsset
	}>()

	const pieces = await webDb.selectFrom('web_pieces').selectAll().execute()

	let updated = 0

	for (const piece of pieces) {
		const assets = await webDb
			.selectFrom('web_pieces_assets')
			.selectAll()
			.where('piece_file_path', '=', piece.file_path)
			.execute()

		const pathToKey = new Map<string, string>()
		for (const asset of assets) {
			if (asset.piece_asset_path && asset.asset_key) {
				pathToKey.set(asset.piece_asset_path, asset.asset_key)
			}
		}

		if (pathToKey.size === 0) continue

		const sanitized = sanitizeMetadata(piece.json_metadata, pathToKey)
		if (sanitized === piece.json_metadata) continue

		await webDb
			.updateTable('web_pieces')
			.set({ json_metadata: sanitized })
			.where('key', '=', piece.key)
			.execute()

		updated++
	}

	return updated
}

export default async function backfill(config: Config) {
	const db = await getDatabaseAndMigrate(config)

	const webMigrationResult = await runWebMigrations(db)
	if (webMigrationResult.error) {
		throw new Error(`Web migration failed: ${webMigrationResult.error}`)
	}

	const keysBackfilled = await backfillAssetKeys(db, config)
	console.log(`[backfill] asset_key: ${keysBackfilled} rows updated`)

	const metadataUpdated = await backfillSanitizeMetadata(db)
	console.log(`[backfill] sanitize metadata: ${metadataUpdated} pieces updated`)
}
