import type { PiecesDiff } from '@luzzle/core'
import { completed, type Step } from '../core/step.js'
import { getPendingPublication, type PublicationPiece } from '../services/publication.js'
import { includePendingPieces } from '../workflows/pieces-diff.js'

export interface PublishPlan {
	pieces: PublicationPiece[]
	summary: PiecesDiff
}

export interface PublishPrepareInput {
	summary: PiecesDiff
	filePaths?: string[]
}

export const publishPrepareStep: Step<PublishPrepareInput, PublishPlan> = {
	name: 'publish.prepare',
	async run({ summary: indexSummary, filePaths }, { db, config, logger }) {
		const pending = await getPendingPublication(db, config)
		let pieces = pending.pieces
		if (filePaths !== undefined) {
			const selectedPaths = new Set(filePaths)
			pieces = pending.pieces.filter((piece) => selectedPaths.has(piece.filePath))
		}
		const targetPaths = new Set(pieces.map((piece) => piece.filePath))

		// Core sync is global; only authoritative pending targets count as upserts.
		const globalChanges: PiecesDiff = {
			schemas: indexSummary.schemas,
			pieces: { added: [], updated: [], pruned: indexSummary.pieces.pruned },
		}
		const selectedChanges: PiecesDiff['pieces'] = {
			added: pending.diff.added.filter((filePath) => targetPaths.has(filePath)),
			updated: pending.diff.updated.filter((filePath) => targetPaths.has(filePath)),
			pruned: pending.diff.pruned,
		}
		const publicationSummary = includePendingPieces(globalChanges, selectedChanges)

		logger.info('publish.prepare complete', { count: pieces.length })
		return completed({ pieces, summary: publicationSummary })
	},
}
