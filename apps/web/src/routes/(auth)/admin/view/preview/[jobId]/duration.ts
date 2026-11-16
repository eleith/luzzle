import type { ProgressPhase } from '#lib/components/progress.js'

export function formatDuration(ms: number): string {
	if (ms < 0) return '0s'
	const seconds = Math.floor(ms / 1000)
	if (seconds < 60) return `${seconds}s`
	const minutes = Math.floor(seconds / 60)
	return `${minutes}m ${seconds % 60}s`
}

/** Measure rendering phases, never time spent waiting in the queue. */
export function previewDuration(
	phases: ProgressPhase[],
	status: string,
	finishedAt: string | null,
	now = Date.now()
): number | null {
	if (phases.length === 0) return null
	const terminal = status === 'completed' || status === 'failed' || status === 'expired'
	if (status !== 'running' && !terminal) return null

	const start = phases[0].started_at
	const last = phases[phases.length - 1]
	// Preserve the console's phase-span end, including a known epoch-zero finish.
	const end =
		last.finished_at ??
		(status === 'running' ? now : finishedAt === null ? NaN : Date.parse(finishedAt))
	if (!Number.isFinite(start) || !Number.isFinite(end)) return null
	return Math.max(0, end - start)
}
