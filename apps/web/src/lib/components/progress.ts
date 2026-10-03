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
