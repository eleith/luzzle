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

function piecePath(file: string): string {
	return file
		.split('/')
		.map((segment) => encodeURIComponent(segment))
		.join('/')
}

export function editorHref(file: string): string {
	return `/admin/piece/${piecePath(file)}/source`
}

export function liveHref(file: string): string {
	return `/admin/piece/${piecePath(file)}/live`
}
