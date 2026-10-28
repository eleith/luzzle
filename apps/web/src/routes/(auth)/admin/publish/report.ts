import type { PiecesDiff } from '@luzzle/core'
import type { PublishPieceFailure } from '@luzzle/web.jobs'

export { editorHref, publishedHref } from '$lib/pieces/navigation'

export function selectablePaths(diff: PiecesDiff): string[] {
	return [...new Set([...diff.pieces.added, ...diff.pieces.updated])]
}

export type PublicationOutcome = {
	filePath: string
	state: 'published' | 'failed' | 'removed'
	message?: string
}

export function completionReport(
	completion: { id: string; refreshed: boolean; failures: PublishPieceFailure[] },
	publication: { jobId: string; state: string; diff: PiecesDiff | null } | null
): { diff: PiecesDiff | null; failedPieces: PublishPieceFailure[] } {
	const unavailable = { diff: null, failedPieces: completion.failures }
	if (!completion.refreshed) return unavailable
	if (!publication || publication.jobId !== completion.id) return unavailable
	if (publication.state !== 'completed') return unavailable
	return { diff: publication.diff, failedPieces: completion.failures }
}

export function recordPublication(
	diff: PiecesDiff | null,
	failures: PublishPieceFailure[],
	previous: PublicationOutcome[] = []
): PublicationOutcome[] {
	const outcomes = new Map(previous.map((outcome) => [outcome.filePath, outcome]))
	const failed = new Set(failures.map((failure) => failure.filePath))
	for (const filePath of diff ? selectablePaths(diff) : []) {
		if (!failed.has(filePath)) outcomes.set(filePath, { filePath, state: 'published' })
	}
	for (const { filePath, message } of failures) {
		outcomes.set(filePath, { filePath, state: 'failed', message })
	}
	for (const filePath of diff?.pieces.pruned ?? []) {
		outcomes.set(filePath, { filePath, state: 'removed' })
	}
	return [...outcomes.values()]
}

export function pendingAfterPublication(
	pending: PiecesDiff | null,
	diff: PiecesDiff | null,
	failures: PublishPieceFailure[]
): PiecesDiff | null {
	if (!pending || !diff) return pending
	const confirmed = recordPublication(diff, failures)
	const confirmedPiecePaths = new Set(
		confirmed.filter((outcome) => outcome.state !== 'failed').map((outcome) => outcome.filePath)
	)
	const removed = new Set(diff.pieces.pruned)
	return {
		pieces: {
			added: pending.pieces.added.filter((file) => !confirmedPiecePaths.has(file)),
			updated: pending.pieces.updated.filter((file) => !confirmedPiecePaths.has(file)),
			pruned: pending.pieces.pruned.filter((file) => !removed.has(file))
		},
		schemas: {
			added: pending.schemas.added.filter((schema) => !diff.schemas.added.includes(schema)),
			updated: pending.schemas.updated.filter((schema) => !diff.schemas.updated.includes(schema)),
			pruned: pending.schemas.pruned.filter((schema) => !diff.schemas.pruned.includes(schema))
		}
	}
}

export function retainSelection(diff: PiecesDiff, paths: string[]): string[] {
	const pending = new Set(selectablePaths(diff))
	return [...new Set(paths)].filter((file) => pending.has(file))
}

export function initialSelection(diff: PiecesDiff, requestedFile: string | null): string[] {
	const paths = selectablePaths(diff)
	if (requestedFile === null) return paths
	return paths.filter((file) => file === requestedFile)
}

export function toggleSelection(paths: string[], file: string, checked: boolean): string[] {
	if (checked) return [...new Set([...paths, file])]
	return paths.filter((path) => path !== file)
}

export function canPublishSelection(diff: PiecesDiff, paths: string[]): boolean {
	const available = new Set(selectablePaths(diff))
	if (paths.some((file) => available.has(file))) return true
	return [diff.pieces.pruned, ...Object.values(diff.schemas)].some((list) => list.length > 0)
}

export type ActiveKind = 'audit' | 'publish'

export function getRunKind(workflowName: unknown, fallback: ActiveKind | null): ActiveKind | null {
	if (workflowName === 'Publish') return 'publish'
	if (workflowName === 'PublishAudit') return 'audit'
	return fallback
}

export type PhaseProgress = {
	phase: string
	status: string
	started_at: number
	finished_at: number | null
	message: string | null
}

export type PhaseLog = {
	job_id: string
	phase: string
	line_number: number
	ts: number
	level: string
	message: string
}

export function mergePhaseLogs(
	current: Record<string, PhaseLog[]>,
	incoming: PhaseLog[]
): Record<string, PhaseLog[]> {
	const phases = new Map<string, Map<string, PhaseLog>>()
	for (const phase of Object.keys(current)) {
		phases.set(phase, new Map())
	}
	for (const rows of [...Object.values(current), incoming]) {
		for (const row of rows) {
			let phaseRows = phases.get(row.phase)
			if (!phaseRows) {
				phaseRows = new Map()
				phases.set(row.phase, phaseRows)
			}
			const identity = JSON.stringify([row.job_id, row.line_number])
			phaseRows.set(identity, row)
		}
	}
	return Object.fromEntries(
		[...phases].map(([phase, rows]) => [
			phase,
			[...rows.values()].sort((a, b) => a.line_number - b.line_number)
		])
	)
}

export function latestPhases<T extends { phase: string }>(rows: T[]): T[] {
	const latestByPhase = new Map<string, T>()
	for (const row of rows) {
		latestByPhase.set(row.phase, row)
	}
	return Array.from(latestByPhase.values())
}
