export const SSE_HEADERS = {
	'Content-Type': 'text/event-stream',
	'Cache-Control': 'no-cache',
	Connection: 'keep-alive',
	'X-Accel-Buffering': 'no'
}

export function encodeEvent(event: string, data: unknown, id?: string): string {
	const lines = [`event: ${event}`]
	if (id) lines.push(`id: ${id}`)
	lines.push(`data: ${JSON.stringify(data)}`)
	return lines.join('\n') + '\n\n'
}
