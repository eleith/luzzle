// Source of truth for the JobProgressPurge Job contract.
// Mirrored by hand into the explorer via `npm run sync-worker-types`.
// Keep this file dependency-free: pure types only.

export interface JobProgressPurgePayload {
	retentionDays?: number
}

export type JobProgressPurgeResult = 'ok'
