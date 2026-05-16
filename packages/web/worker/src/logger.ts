export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'stdout' | 'stderr'

export interface Logger {
	debug(message: string, fields?: Record<string, unknown>): void
	info(message: string, fields?: Record<string, unknown>): void
	warn(message: string, fields?: Record<string, unknown>): void
	error(message: string, fields?: Record<string, unknown>): void
	stdout(message: string, fields?: Record<string, unknown>): void
	stderr(message: string, fields?: Record<string, unknown>): void
}

export function log(
	level: LogLevel,
	message: string,
	fields: Record<string, unknown> = {}
): void {
	const line = JSON.stringify({
		ts: new Date().toISOString(),
		level,
		message,
		...fields
	})
	process.stdout.write(line + '\n')
}

export function createLogger(): Logger {
	return {
		debug(message, fields) { log('debug', message, fields) },
		info(message, fields) { log('info', message, fields) },
		warn(message, fields) { log('warn', message, fields) },
		error(message, fields) { log('error', message, fields) },
		stdout(message, fields) { log('stdout', message, fields) },
		stderr(message, fields) { log('stderr', message, fields) },
	}
}
