import { Pieces, selectItemAssets } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getDatabase, getDatabaseAndMigrate } from '../../lib/database.js'
import { Config } from '@luzzle/web.utils'

type SyncOptions = {
	archiveDir?: string
	dryRun?: boolean
	force?: boolean
	prune?: boolean
}

async function syncSchemas(
	db: ReturnType<typeof getDatabase>,
	pieces: Pieces,
	options: Pick<SyncOptions, 'dryRun' | 'force'>
) {
	const { dryRun = false, force = false } = options
	const sync = await pieces.sync(db, { dryRun, force })

	for await (const result of sync) {
		if (result.error) {
			console.error(`[error] syncing schema ${result.name}: ${result.message}`)
		} else if (result.action !== 'skipped') {
			console.log(`[${result.action}] schema: ${result.name}`)
		}
	}

	const prune = await pieces.prune(db, { dryRun })
	for await (const result of prune) {
		if (result.error) {
			console.error(`[error] pruning schema ${result.name}: ${result.message}`)
		} else if (result.action === 'pruned') {
			console.log(`[${result.action}] schema: ${result.name}`)
		}
	}
}

async function syncPieces(
	db: ReturnType<typeof getDatabase>,
	pieces: Pieces,
	storage: ReturnType<typeof getStorage>,
	files: Awaited<ReturnType<Pieces['getFilesIn']>>,
	options: Pick<SyncOptions, 'dryRun' | 'force' | 'prune'>
) {
	const { dryRun = false, force = false, prune = false } = options
	for (const name of files.types) {
		const piece = await pieces.getPiece(name)
		const piecesOnDisk = files.pieces.filter((one) => pieces.parseFilename(one).type === name)

		let processFiles = piecesOnDisk
		if (!force) {
			const isOutdated = await Promise.all(piecesOnDisk.map((file) => piece.isOutdated(file, db)))
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

	if (prune) {
		await pruneAssets(db, storage, files, dryRun)
	}
}

async function pruneAssets(
	db: ReturnType<typeof getDatabase>,
	storage: ReturnType<typeof getStorage>,
	files: Awaited<ReturnType<Pieces['getFilesIn']>>,
	dryRun: boolean
) {
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

export default async function sync(options: SyncOptions, config: Config) {
	const storage = getStorage(config, options.archiveDir)
	const db = await getDatabaseAndMigrate(config)
	const pieces = new Pieces(storage)
	const dryRun = options.dryRun || false
	const force = options.force || false
	const prune = options.prune || false

	const files = await pieces.getFilesIn('.', { deep: true })

	await syncSchemas(db, pieces, { dryRun, force })
	await syncPieces(db, pieces, storage, files, { dryRun, force, prune })
}
