import { Pieces, StorageFileSystem, getDatabaseClient, type PiecesDiff } from '@luzzle/core'
import { completed, type Step, type StepResult } from '../core/step.js'
import { resolveDbPath } from '../services/db.js'

export const luzzleSyncStep: Step<void, PiecesDiff> = {
	name: 'luzzle.sync',
	async run(_input, ctx): Promise<StepResult<PiecesDiff>> {
		const { config, logger } = ctx
		logger.info('luzzle.sync starting')

		const storage = new StorageFileSystem(config.storage.root)
		const dbPath = resolveDbPath(config)
		const db = getDatabaseClient(dbPath)

		const pieces = new Pieces(storage)
		const diff: PiecesDiff = {
			schemas: { added: [], updated: [], pruned: [] },
			pieces: { added: [], updated: [], pruned: [] },
		}

		const schemaSync = await pieces.sync(db, {})
		for await (const result of schemaSync) {
			if (result.error) {
				logger.warn(`schema sync error for ${result.name}: ${result.message}`)
			} else if (result.action === 'added') {
				diff.schemas.added.push(result.name)
				logger.info(`schema added: ${result.name}`)
			} else if (result.action === 'updated') {
				diff.schemas.updated.push(result.name)
				logger.info(`schema updated: ${result.name}`)
			}
		}

		const schemaPrune = await pieces.prune(db)
		for await (const result of schemaPrune) {
			if (result.error) {
				logger.warn(`schema prune error for ${result.name}: ${result.message}`)
			} else if (result.action === 'pruned') {
				diff.schemas.pruned.push(result.name)
				logger.info(`schema pruned: ${result.name}`)
			}
		}

		const files = await pieces.getFilesIn('.', { deep: true })

		for (const typeName of files.types) {
			const piece = await pieces.getPiece(typeName)
			const piecesOnDisk = files.pieces.filter(
				(one) => pieces.parseFilename(one).type === typeName
			)

			const syncItems = await piece.sync(db, piecesOnDisk, {})
			for await (const result of syncItems) {
				if (result.error) {
					logger.warn(`item sync error for ${result.file}: ${result.message}`)
				} else if (result.action === 'added') {
					diff.pieces.added.push(result.file)
					logger.info(`item added: ${result.file}`)
				} else if (result.action === 'updated') {
					diff.pieces.updated.push(result.file)
					logger.info(`item updated: ${result.file}`)
				}
			}

			const pruneItems = await piece.prune(db, piecesOnDisk)
			for await (const result of pruneItems) {
				if (result.error) {
					logger.warn(`item prune error for ${result.file}: ${result.message}`)
				} else if (result.action === 'pruned') {
					diff.pieces.pruned.push(result.file)
					logger.info(`item pruned: ${result.file}`)
				}
			}
		}

		const changedCount = diff.pieces.added.length + diff.pieces.updated.length
		logger.info('luzzle.sync complete', { changed: changedCount })
		return completed(diff, `${changedCount} pieces changed`)
	},
}
