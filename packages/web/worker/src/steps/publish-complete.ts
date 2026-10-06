import type { PublishPieceFailure } from '@luzzle/web.jobs'
import { completed, type Step } from '../core/step.js'
import type { PublicationPiece } from '../services/publication.js'

export interface PublishCompleteInput {
	pieces: PublicationPiece[]
	failedPieces: PublishPieceFailure[]
}

export const publishCompleteStep: Step<PublishCompleteInput, void> = {
	name: 'publish.complete',
	async run({ pieces, failedPieces }, { db, logger }) {
		const failedPaths = new Set(failedPieces.map((piece) => piece.filePath))
		let count = 0

		for (const piece of pieces) {
			if (failedPaths.has(piece.filePath)) continue

			await db
				.updateTable('web_pieces')
				.set({ content_hash: piece.contentHash })
				.where('file_path', '=', piece.filePath)
				.execute()
			count += 1
		}

		logger.info('publish.complete recorded published hashes', { count })
		return completed(undefined)
	},
}
