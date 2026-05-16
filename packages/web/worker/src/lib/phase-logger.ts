import { getWorkerContext } from '../handlers/context.js'
import type { Logger } from '../logger.js'

let activePhase: { jobId: number; phase: string } | null = null
let currentLineNumber = 0

export function setActivePhase(phase: { jobId: number; phase: string }): void {
	activePhase = phase
	currentLineNumber = 0
}

export function clearActivePhase(): void {
	activePhase = null
}

function formatMessage(message: string, fields?: Record<string, unknown>): string {
	if (!fields || Object.keys(fields).length === 0) {
		return message
	}
	return `${message} ${JSON.stringify(fields)}`
}

async function insertLog(level: string, message: string, fields?: Record<string, unknown>) {
	if (!activePhase) return

	const { db } = getWorkerContext()
	const { jobId, phase } = activePhase
	currentLineNumber++
	const lineNum = currentLineNumber

	try {
		await db
			.insertInto('job_progress_logs')
			.values({
				job_id: jobId,
				phase,
				line_number: lineNum,
				ts: Date.now(),
				level,
				message: formatMessage(message, fields)
			})
			.execute()
	} catch (err) {
		// Suppress database insertion errors from crashing the logger
		console.error('Failed to insert log into job_progress_logs:', err)
	}
}

export class PhaseLogger implements Logger {
	constructor(private readonly baseLogger: Logger) {}

	debug(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.debug(message, fields)
		insertLog('debug', message, fields).catch(() => {})
	}

	info(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.info(message, fields)
		insertLog('info', message, fields).catch(() => {})
	}

	warn(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.warn(message, fields)
		insertLog('warn', message, fields).catch(() => {})
	}

	error(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.error(message, fields)
		insertLog('error', message, fields).catch(() => {})
	}

	stdout(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.stdout(message, fields)
		insertLog('stdout', message, fields).catch(() => {})
	}

	stderr(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.stderr(message, fields)
		insertLog('stderr', message, fields).catch(() => {})
	}
}
