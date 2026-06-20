import type { PiecesDiff } from '@luzzle/core'

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isDiffSummary(value: unknown): value is PiecesDiff['schemas'] {
	if (typeof value !== 'object' || value === null) return false
	const summary = value as Record<string, unknown>
	return (
		isStringArray(summary.added) && isStringArray(summary.updated) && isStringArray(summary.pruned)
	)
}

/**
 * Parse a `workflow_runs.output` JSON string into a PiecesDiff. Tolerates null,
 * malformed JSON, and legacy shapes (e.g. a historical Publish run whose output
 * was the `'ok'` literal) by returning null.
 */
export function parsePiecesDiff(output: string | null): PiecesDiff | null {
	if (!output) return null

	let parsed: unknown
	try {
		parsed = JSON.parse(output)
	} catch {
		return null
	}

	if (typeof parsed !== 'object' || parsed === null) return null
	const candidate = parsed as Record<string, unknown>

	if (isDiffSummary(candidate.schemas) && isDiffSummary(candidate.pieces)) {
		return { schemas: candidate.schemas, pieces: candidate.pieces }
	}

	return null
}
