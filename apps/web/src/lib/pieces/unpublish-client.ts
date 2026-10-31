import { readJsonEvents } from '#lib/sse.js'

export type UnpublishFailureReason =
	| 'busy'
	| 'sign-in'
	| 'request'
	| 'connection'
	| 'response'
	| 'job'
export type UnpublishOutcome =
	| { state: 'completed'; jobId: string }
	| { state: 'failed'; reason: UnpublishFailureReason; detail: string; jobId?: string }

function isObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function messageDetail(value: unknown): string {
	if (value instanceof Error) return value.message
	if (typeof value === 'string') {
		try {
			const parsed: unknown = JSON.parse(value)
			if (isObject(parsed) && typeof parsed.message === 'string') return parsed.message
		} catch {
			// Server diagnostics can be plain text or a serialized workflow error.
		}
		return value
	}
	if (isObject(value) && typeof value.message === 'string') return value.message
	return ''
}

function failure(reason: UnpublishFailureReason, detail = '', jobId?: string): UnpublishOutcome {
	return { state: 'failed', reason, detail, jobId }
}

function requiresSignIn(response: Response): boolean {
	return response.redirected || response.status === 401 || response.status === 403
}

async function observeUnpublishJob(
	jobId: string,
	signal: AbortSignal
): Promise<UnpublishOutcome | undefined> {
	try {
		const stream = await fetch(`/api/admin/publish/${encodeURIComponent(jobId)}/stream`, {
			headers: { Accept: 'text/event-stream' },
			signal
		})
		if (signal.aborted) {
			await stream.body?.cancel()
			return
		}
		if (requiresSignIn(stream)) {
			await stream.body?.cancel()
			return failure('sign-in', '', jobId)
		}
		if (!stream.ok) return failure('connection', messageDetail(await stream.text()), jobId)
		if (!stream.headers.get('content-type')?.startsWith('text/event-stream')) {
			await stream.body?.cancel()
			return failure('response', '', jobId)
		}
		for await (const event of readJsonEvents(stream, signal)) {
			if (signal.aborted) return
			if (event.type === 'error') return failure('connection', messageDetail(event.data), jobId)
			if (event.type !== 'state' && event.type !== 'done') continue
			if (!isObject(event.data) || event.data.workflowName !== 'Unpublish') {
				return failure('response', '', jobId)
			}
			if (event.type !== 'done') continue
			if (event.data.state === 'completed' && event.data.result === 'ok') {
				return { state: 'completed', jobId }
			}
			const details: string[] = []
			if (Array.isArray(event.data.errors)) {
				for (const error of event.data.errors) {
					const detail = messageDetail(error)
					if (detail) details.push(detail)
				}
			}
			return failure('job', details.join('\n'), jobId)
		}
		if (signal.aborted) return
		return failure('connection', '', jobId)
	} catch (error) {
		if (!signal.aborted) return failure('connection', messageDetail(error), jobId)
	}
}

export async function submitUnpublish(
	filePath: string,
	signal: AbortSignal
): Promise<UnpublishOutcome | undefined> {
	if (signal.aborted) return
	try {
		const response = await fetch('/api/admin/unpublish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filePath }),
			signal
		})
		if (signal.aborted) {
			await response.body?.cancel()
			return
		}
		if (requiresSignIn(response)) {
			await response.body?.cancel()
			return failure('sign-in')
		}
		if (response.status === 409) {
			await response.body?.cancel()
			return failure('busy')
		}
		if (!response.ok) return failure('request', messageDetail(await response.text()))
		const accepted = await response.json()
		if (!isObject(accepted)) return failure('response')
		if (typeof accepted.jobId !== 'string' || accepted.jobId.length === 0) {
			return failure('response')
		}
		if (signal.aborted) return
		return observeUnpublishJob(accepted.jobId, signal)
	} catch (error) {
		if (!signal.aborted) return failure('request', messageDetail(error))
	}
}
