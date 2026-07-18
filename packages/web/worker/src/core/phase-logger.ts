import type { Kysely } from 'kysely'
import type { Logger } from '../services/logger.js'
import type { AppDatabase } from '../services/db.js'

function formatMessage(message: string, fields?: Record<string, unknown>): string {
	if (!fields || Object.keys(fields).length === 0) {
		return message
	}
	return `${message} ${JSON.stringify(fields)}`
}

export class PhaseLogger implements Logger {
	private activePhase: { jobId: string; phase: string } | null = null
	private currentLineNumber = 0
	private readonly baseLogger: Logger
	private readonly db: Kysely<AppDatabase>

	constructor(
		baseLogger: Logger,
		db: Kysely<AppDatabase>
	) {
		this.baseLogger = baseLogger
		this.db = db
	}

	setActivePhase(phase: { jobId: string; phase: string }): void {
		this.activePhase = phase
		this.currentLineNumber = 0
	}

	clearActivePhase(): void {
		this.activePhase = null
	}

	private async insertLog(
		level: string,
		message: string,
		fields?: Record<string, unknown>
	): Promise<void> {
		if (!this.activePhase) return

		const { jobId, phase } = this.activePhase
		this.currentLineNumber++
		const lineNum = this.currentLineNumber

		try {
			await this.db
				.insertInto('job_progress_logs')
				.values({
					job_id: jobId,
					phase,
					line_number: lineNum,
					ts: Date.now(),
					level,
					message: formatMessage(message, fields),
				})
				.execute()
		} catch (err) {
			console.error('Failed to insert log into job_progress_logs:', err)
		}
	}

	debug(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.debug(message, fields)
		this.insertLog('debug', message, fields).catch(() => {})
	}

	info(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.info(message, fields)
		this.insertLog('info', message, fields).catch(() => {})
	}

	warn(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.warn(message, fields)
		this.insertLog('warn', message, fields).catch(() => {})
	}

	error(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.error(message, fields)
		this.insertLog('error', message, fields).catch(() => {})
	}

	stdout(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.stdout(message, fields)
		this.insertLog('stdout', message, fields).catch(() => {})
	}

	stderr(message: string, fields?: Record<string, unknown>): void {
		this.baseLogger.stderr(message, fields)
		this.insertLog('stderr', message, fields).catch(() => {})
	}
}
