import type { PiecesDiff } from '@luzzle/core'

export function emptyPiecesDiff(): PiecesDiff {
	return {
		schemas: { added: [], updated: [], pruned: [] },
		pieces: { added: [], updated: [], pruned: [] },
	}
}
