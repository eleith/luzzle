import type { DatabaseSync } from 'node:sqlite'
import { getLatestWorkflowRun, getWorkflowRun, type WorkflowRunRow } from '@luzzle/web.jobs'

const PUBLISH_WORKFLOWS = ['Publish', 'PublishAudit'] as const
const IN_FLIGHT_STATES = new Set(['pending', 'running'])
const COMPLETED_STATES = new Set(['completed', 'succeeded'])

/**
 * Publish and PublishAudit form one mutual-exclusion group — an audit's bisync
 * mutates the same archive a publish reads. Returns the in-flight run if either
 * workflow is pending or running, else null.
 */
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

/**
 * A publish may only ship a freshly reviewed audit: the given run must be a
 * completed PublishAudit and still be the latest audit (no newer one since).
 */
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

	// A publish consumes its audit: if a publish started after this audit, the
	// audit no longer reflects what's pending. (created_at is ISO, so string
	// comparison is chronological.)
	const lastPublish = getLatestWorkflowRun(db, 'Publish')
	if (lastPublish && lastPublish.created_at > run.created_at) {
		return {
			ok: false,
			reason: 'changes were published after this check; re-check before publishing'
		}
	}

	return { ok: true }
}
