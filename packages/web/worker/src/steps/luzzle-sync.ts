import { Pieces, StorageFileSystem, getDatabaseClient } from '@luzzle/core'
import { completed, type Step, type StepResult } from '../core/step.js'
import { resolveDbPath } from '../services/db.js'

export const luzzleSyncStep: Step<void, { changedPaths: string[] }> = {
	name: 'luzzle.sync',
	async run(_input, ctx): Promise<StepResult<{ changedPaths: string[] }>> {
		const { config, logger } = ctx
		logger.info('luzzle.sync starting')

		const storage = new StorageFileSystem(config.storage.root)
		const dbPath = resolveDbPath(config)
		const db = getDatabaseClient(dbPath)

		const pieces = new Pieces(storage)

		const schemaSync = await pieces.sync(db, {})
		for await (const result of schemaSync) {
			if (result.error) {
				logger.warn(`schema sync error for ${result.name}: ${result.message}`)
			} else if (result.action === 'added' || result.action === 'updated') {
				logger.info(`schema ${result.action}: ${result.name}`)
			}
		}

		const schemaPrune = await pieces.prune(db, { dryRun: false })
		for await (const result of schemaPrune) {
			if (result.error) {
				logger.warn(`schema prune error for ${result.name}: ${result.message}`)
			} else if (result.action === 'pruned') {
				logger.info(`schema pruned: ${result.name}`)
			}
		}

		const files = await pieces.getFilesIn('.', { deep: true })
		const changedPaths: string[] = []

		for (const typeName of files.types) {
			const piece = await pieces.getPiece(typeName)
			const piecesOnDisk = files.pieces.filter(
				(one) => pieces.parseFilename(one).type === typeName
			)

			const outdatedFlags = await Promise.all(
				piecesOnDisk.map((file) => piece.isOutdated(file, db))
			)
			const outdatedFiles = piecesOnDisk.filter((_, i) => outdatedFlags[i])

			const syncItems = await piece.sync(db, outdatedFiles, {})
			for await (const result of syncItems) {
				if (result.error) {
					logger.warn(`item sync error for ${result.file}: ${result.message}`)
				} else {
					if (result.action === 'added' || result.action === 'updated') {
						changedPaths.push(result.file)
					}
					logger.info(`item ${result.action}: ${result.file}`)
				}
			}

			const pruneItems = await piece.prune(db, piecesOnDisk, { dryRun: false })
			for await (const result of pruneItems) {
				if (result.error) {
					logger.warn(`item prune error for ${result.file}: ${result.message}`)
				} else if (result.action === 'pruned') {
					logger.info(`item pruned: ${result.file}`)
				}
			}
		}

		logger.info('luzzle.sync complete', { changed: changedPaths.length })
		return completed({ changedPaths }, `${changedPaths.length} pieces changed`)
	},
}
