import type { PiecesDiff } from '@luzzle/core'
import { completed, type Step } from '../core/step.js'
import { getPendingPublication } from '../services/publication.js'
import { includePendingPieces } from '../workflows/pieces-diff.js'

export interface PublishPlan {
	filePaths: string[]
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
		let selectedPaths = pending.pieces.map((piece) => piece.filePath)
		if (filePaths !== undefined) {
			const requestedPaths = new Set(filePaths)
			selectedPaths = selectedPaths.filter((filePath) => requestedPaths.has(filePath))
		}
		const targetPaths = new Set(selectedPaths)

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

		logger.info('publish.prepare complete', { count: selectedPaths.length })
		return completed({ filePaths: selectedPaths, summary: publicationSummary })
	},
}
