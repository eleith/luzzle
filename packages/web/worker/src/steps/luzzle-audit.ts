import { Pieces, StorageFileSystem, getDatabaseClient, type PiecesDiff } from '@luzzle/core'
import { completed, type Step, type StepResult } from '../core/step.js'
import { resolveDbPath } from '../services/db.js'
import { getPendingPublication } from '../services/publication.js'
import { includePendingPieces } from '../workflows/pieces-diff.js'

export const luzzleAuditStep: Step<void, PiecesDiff> = {
	name: 'luzzle.audit',
	async run(_input, ctx): Promise<StepResult<PiecesDiff>> {
		const { config, logger } = ctx
		logger.info('luzzle.audit starting')

		const storage = new StorageFileSystem(config.storage.root)
		const dbPath = resolveDbPath(config)
		const db = getDatabaseClient(dbPath)

		const pieces = new Pieces(storage)
		const sourceDiff = await pieces.diff(db)
		const pending = await getPendingPublication(ctx.db, config)
		const diff = includePendingPieces(sourceDiff, pending.diff)

		const changedCount =
			diff.pieces.added.length +
			diff.pieces.updated.length +
			diff.pieces.pruned.length +
			diff.schemas.added.length +
			diff.schemas.updated.length +
			diff.schemas.pruned.length

		logger.info('luzzle.audit complete', { changes: changedCount })
		return completed(diff, `${changedCount} pending change(s)`)
	},
}
