export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

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
