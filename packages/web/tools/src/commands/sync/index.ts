import { loadConfig } from '@luzzle/web.utils/server'
import { getDatabaseClient, Pieces, selectItemAssets } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import path from 'path'

type SyncOptions = {
	configPath?: string
	archiveDir?: string
	dryRun?: boolean
	force?: boolean
	prune?: boolean
}

export default async function sync(options: SyncOptions) {
	const config = loadConfig(options.configPath)
	const storage = getStorage(config, options.archiveDir)
	const dbPath = path.resolve(
		options.configPath ? path.dirname(options.configPath) : process.cwd(),
		config.paths.database
	)
	const db = getDatabaseClient(dbPath)
	const pieces = new Pieces(storage)
	const dryRun = options.dryRun || false
	const force = options.force || false

	if (dryRun) {
		console.log('--- DRY RUN ---')
	}

	const syncSchemas = await pieces.sync(db, { dryRun, force })
	for await (const result of syncSchemas) {
		if (result.error) {
			console.error(`[error] syncing schema ${result.name}: ${result.message}`)
		} else if (result.action !== 'skipped') {
			console.log(`[${result.action}] schema: ${result.name}`)
		}
	}

	const pruneSchemas = await pieces.prune(db, { dryRun })
	for await (const result of pruneSchemas) {
		if (result.error) {
			console.error(`[error] pruning schema ${result.name}: ${result.message}`)
		} else if (result.action === 'pruned') {
			console.log(`[${result.action}] schema: ${result.name}`)
		}
	}

	const files = await pieces.getFilesIn('.', { deep: true })
	for (const name of files.types) {
		const piece = await pieces.getPiece(name)
		const piecesOnDisk = files.pieces.filter((one) => pieces.parseFilename(one).type === name)

		let processFiles = piecesOnDisk
		if (!force) {
			const isOutdated = await Promise.all(
				piecesOnDisk.map((file) => piece.isOutdated(file, db))
			)
			processFiles = piecesOnDisk.filter((_, i) => isOutdated[i])
		}

		const syncItems = await piece.sync(db, processFiles, { dryRun, force })
		for await (const result of syncItems) {
			if (result.error) {
				console.error(`[error] syncing item ${result.file}: ${result.message}`)
			} else if (result.action !== 'skipped') {
				console.log(`[${result.action}] item: ${result.file}`)
			}
		}

		const pruneItems = await piece.prune(db, piecesOnDisk, { dryRun })
		for await (const result of pruneItems) {
			if (result.error) {
				console.error(`[error] pruning item ${result.file}: ${result.message}`)
			} else if (result.action === 'pruned') {
				console.log(`[${result.action}] item: ${result.file}`)
			}
		}
	}

	if (options.prune) {
		const dbAssets = await selectItemAssets(db)
		const dbAssetsSet = new Set<string>(dbAssets)
		const missingAssets = files.assets.filter((asset) => !dbAssetsSet.has(asset))

		for (const asset of missingAssets) {
			if (!dryRun) {
				await storage.delete(asset)
			}
			console.log(`[pruned] asset: ${asset}`)
		}
	}
}
