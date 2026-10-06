import type { PiecesDiff } from '@luzzle/core'

export function includePendingPieces(diff: PiecesDiff, pending: PiecesDiff['pieces']): PiecesDiff {
	const pieces = {
		added: [...diff.pieces.added],
		updated: [...diff.pieces.updated],
		pruned: [...diff.pieces.pruned],
	}
	const reportedPaths = new Set([...pieces.added, ...pieces.updated, ...pieces.pruned])

	for (const action of ['added', 'updated', 'pruned'] as const) {
		for (const filePath of pending[action]) {
			if (reportedPaths.has(filePath)) continue
			pieces[action].push(filePath)
			reportedPaths.add(filePath)
		}
	}

	return { schemas: diff.schemas, pieces }
}

export function emptyPiecesDiff(): PiecesDiff {
	return {
		schemas: { added: [], updated: [], pruned: [] },
		pieces: { added: [], updated: [], pruned: [] },
	}
}
