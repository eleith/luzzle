import type { BackendSqlite } from 'openworkflow/sqlite'
import { getLatestWorkflowRun, getWorkflowRun } from '@luzzle/web.jobs'
import type { PiecesDiff } from '@luzzle/core'

const COMPLETED_STATES = new Set(['completed', 'succeeded'])
let publishAdmission: Promise<void> = Promise.resolve()

export async function withPublishAdmission<T>(operation: () => Promise<T>): Promise<T> {
	const previous = publishAdmission
	let release!: () => void
	publishAdmission = new Promise<void>((resolve) => {
		release = resolve
	})
	await previous
	try {
		return await operation()
	} finally {
		release()
	}
}

export async function findInFlightPublishRun(
	backend: Pick<BackendSqlite, 'listWorkflowRuns'>
): Promise<{ id: string } | null> {
	for (const workflowName of ['Publish', 'PublishAudit']) {
		const { data } = await backend.listWorkflowRuns({ workflowName, limit: 5 })
		const active = data.find((run) => run.status === 'pending' || run.status === 'running')
		if (active) return { id: active.id }
	}
	return null
}

export type AuditGuard = { ok: true } | { ok: false; reason: string }

export async function validateAuditForPublish(
	backend: Pick<BackendSqlite, 'getWorkflowRun' | 'listWorkflowRuns'>,
	auditRunId: unknown
): Promise<AuditGuard> {
	if (typeof auditRunId !== 'string' || auditRunId.length === 0) {
		return { ok: false, reason: 'no audit run provided; check for changes before publishing' }
	}

	const run = await getWorkflowRun(backend, auditRunId)
	if (!run || run.workflow_name !== 'PublishAudit') {
		return { ok: false, reason: 'audit run not found' }
	}
	if (!COMPLETED_STATES.has(run.status)) {
		return { ok: false, reason: 'audit has not completed' }
	}

	const latest = await getLatestWorkflowRun(backend, 'PublishAudit')
	if (!latest || latest.id !== auditRunId) {
		return { ok: false, reason: 'a newer audit has run; re-check before publishing' }
	}

	// a publish consumes its audit; created_at is ISO so string compare is chronological
	const lastPublish = await getLatestWorkflowRun(backend, 'Publish')
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
