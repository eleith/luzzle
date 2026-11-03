export type ProgressPhase = {
	phase: string
	status: string
	started_at: number
	finished_at: number | null
	message: string | null
}

export type ProgressLog = {
	phase: string
	line_number: number
	ts: number
	level: string
	message: string
}

export type JobProgressLog = ProgressLog & { job_id: string }

export function mergePhaseLogs(
	current: Record<string, JobProgressLog[]>,
	incoming: JobProgressLog[]
): Record<string, JobProgressLog[]> {
	const phases = new Map<string, Map<string, JobProgressLog>>()
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
