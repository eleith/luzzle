import type { DatabaseSync } from 'node:sqlite'
import { getLatestWorkflowRun, getWorkflowRun, type WorkflowRunRow } from '@luzzle/web.jobs'
import type { PiecesDiff } from '@luzzle/core'

const PUBLISH_WORKFLOWS = ['Publish', 'PublishAudit'] as const
const IN_FLIGHT_STATES = new Set(['pending', 'running'])
const COMPLETED_STATES = new Set(['completed', 'succeeded'])

// Publish and PublishAudit are mutually exclusive: an audit's bisync mutates the archive a publish reads.
export function findInFlightPublishRun(db: DatabaseSync): WorkflowRunRow | null {
	for (const name of PUBLISH_WORKFLOWS) {
		const run = getLatestWorkflowRun(db, name)
		if (run && IN_FLIGHT_STATES.has(run.status)) {
			return run
		}
	}
	return null
}

export type AuditGuard = { ok: true } | { ok: false; reason: string }

export function validateAuditForPublish(db: DatabaseSync, auditRunId: unknown): AuditGuard {
	if (typeof auditRunId !== 'string' || auditRunId.length === 0) {
		return { ok: false, reason: 'no audit run provided; check for changes before publishing' }
	}

	const run = getWorkflowRun(db, auditRunId)
	if (!run || run.workflow_name !== 'PublishAudit') {
		return { ok: false, reason: 'audit run not found' }
	}
	if (!COMPLETED_STATES.has(run.status)) {
		return { ok: false, reason: 'audit has not completed' }
	}

	const latest = getLatestWorkflowRun(db, 'PublishAudit')
	if (!latest || latest.id !== auditRunId) {
		return { ok: false, reason: 'a newer audit has run; re-check before publishing' }
	}

	// a publish consumes its audit; created_at is ISO so string compare is chronological
	const lastPublish = getLatestWorkflowRun(db, 'Publish')
	if (lastPublish && lastPublish.created_at > run.created_at) {
		return {
			ok: false,
			reason: 'changes were published after this check; re-check before publishing'
		}
	}

	return { ok: true }
}

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

// parses workflow_runs.output; returns null on missing/malformed/legacy ('ok') output
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
