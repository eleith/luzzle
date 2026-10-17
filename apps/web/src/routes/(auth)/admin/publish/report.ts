export { editorHref, publishedHref } from '$lib/pieces/navigation'

export type ActiveKind = 'audit' | 'publish'

export function getRunKind(workflowName: unknown, fallback: ActiveKind | null): ActiveKind | null {
	if (workflowName === 'Publish') return 'publish'
	if (workflowName === 'PublishAudit') return 'audit'
	return fallback
}

export function latestPhases<T extends { phase: string }>(rows: T[]): T[] {
	const latestByPhase = new Map<string, T>()
	for (const row of rows) {
		latestByPhase.set(row.phase, row)
	}
	return Array.from(latestByPhase.values())
}
