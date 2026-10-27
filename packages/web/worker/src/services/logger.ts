import type { Logger as OpenWorkflowLogger } from 'openworkflow'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'stdout' | 'stderr'

export interface Logger {
	debug(message: string, fields?: Record<string, unknown>): void
	info(message: string, fields?: Record<string, unknown>): void
	warn(message: string, fields?: Record<string, unknown>): void
	error(message: string, fields?: Record<string, unknown>): void
	stdout(message: string, fields?: Record<string, unknown>): void
	stderr(message: string, fields?: Record<string, unknown>): void
}

export function log(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
	const line = JSON.stringify({
		ts: new Date().toISOString(),
		level,
		message,
		...fields,
	})
	process.stdout.write(line + '\n')
}

const engineMessages = new Map([
	['Worker tick failed:', 'OpenWorkflow worker tick failed'],
	['Worker schedule tick failed:', 'OpenWorkflow schedule tick failed'],
	['Heartbeat failed:', 'OpenWorkflow heartbeat failed'],
])

function openWorkflowMessage(message: unknown): string {
	if (typeof message !== 'string') return 'OpenWorkflow operational log'
	if (message.startsWith('Critical error during workflow execution for run ')) {
		return 'OpenWorkflow execution failed'
	}
	return engineMessages.get(message) ?? 'OpenWorkflow operational log'
}

export function createOpenWorkflowLogger(logger: Logger): OpenWorkflowLogger {
	return {
		debug: (message) => logger.debug(openWorkflowMessage(message)),
		info: (message) => logger.info(openWorkflowMessage(message)),
		warn: (message) => logger.warn(openWorkflowMessage(message)),
		error: (message) => logger.error(openWorkflowMessage(message)),
	}
}

export function createLogger(): Logger {
	return {
		debug(message, fields) {
			log('debug', message, fields)
		},
		info(message, fields) {
			log('info', message, fields)
		},
		warn(message, fields) {
			log('warn', message, fields)
		},
		error(message, fields) {
			log('error', message, fields)
		},
		stdout(message, fields) {
			log('stdout', message, fields)
		},
		stderr(message, fields) {
			log('stderr', message, fields)
		},
	}
}
