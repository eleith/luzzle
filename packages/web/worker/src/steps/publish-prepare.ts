import type { PiecesDiff } from '@luzzle/core'
import { completed, type Step } from '../core/step.js'
import { getPendingPublication, type PublicationPiece } from '../services/publication.js'
import { includePendingPieces } from '../workflows/pieces-diff.js'

export interface PublishPlan {
	pieces: PublicationPiece[]
	summary: PiecesDiff
}

export const publishPrepareStep: Step<PiecesDiff, PublishPlan> = {
	name: 'publish.prepare',
	async run(summary, { db, config, logger }) {
		const pending = await getPendingPublication(db, config)
		logger.info('publish.prepare complete', { count: pending.pieces.length })
		return completed({
			pieces: pending.pieces,
			summary: includePendingPieces(summary, pending.diff),
		})
	},
}
