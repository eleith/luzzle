import { readJsonEvents } from '#lib/sse.js'
import { MarkdownPublicationStatus, type PiecePublicationState } from './types.js'

export type PublicationAction = 'publish' | 'unpublish'
export type PublicationFailureReason =
	| 'busy'
	| 'sign-in'
	| 'request'
	| 'connection'
	| 'response'
	| 'job'
export type PublicationOutcome =
	| { state: 'completed'; jobId: string }
	| { state: 'failed'; reason: PublicationFailureReason; detail: string; jobId?: string }

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

function publicationFailureDetail(errors: unknown, failedPieces: unknown[]): string {
	const details: string[] = []
	if (Array.isArray(errors)) {
		for (const error of errors) {
			const detail = messageDetail(error)
			if (detail) details.push(detail)
		}
	}
	for (const piece of failedPieces) {
		const detail = messageDetail(piece)
		if (!detail) continue
		if (isObject(piece) && typeof piece.filePath === 'string') {
			details.push(`${piece.filePath}: ${detail}`)
		} else {
			details.push(detail)
		}
	}
	return details.join('\n')
}

export async function getPublicationState(
	filePath: string,
	signal: AbortSignal
): Promise<PiecePublicationState> {
	const query = new URLSearchParams({ filePath })
	const response = await fetch(`/api/admin/publish?${query}`, { signal })
	if (!response.ok || response.redirected) {
		throw new Error('Failed to read publication state')
	}
	const state: unknown = await response.json()
	if (!isObject(state) || typeof state.hasPublishedVersion !== 'boolean') {
		throw new Error('Invalid publication state response')
	}
	const markdownPublicationStatus = state.markdownPublicationStatus
	const validPublicationStatus =
		markdownPublicationStatus === MarkdownPublicationStatus.MATCHING ||
		markdownPublicationStatus === MarkdownPublicationStatus.CHANGED ||
		markdownPublicationStatus === MarkdownPublicationStatus.UNKNOWN
	if (!validPublicationStatus) throw new Error('Invalid publication state response')
	return { hasPublishedVersion: state.hasPublishedVersion, markdownPublicationStatus }
}

function failure(
	reason: PublicationFailureReason,
	detail = '',
	jobId?: string
): PublicationOutcome {
	return { state: 'failed', reason, detail, jobId }
}

function requiresSignIn(response: Response): boolean {
	return response.redirected || response.status === 401 || response.status === 403
}

async function observePublicationJob(
	action: PublicationAction,
	jobId: string,
	signal: AbortSignal
): Promise<PublicationOutcome | undefined> {
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
			if (
				!isObject(event.data) ||
				event.data.workflowName !== (action === 'publish' ? 'Publish' : 'Unpublish')
			) {
				return failure('response', '', jobId)
			}
			if (event.type !== 'done') continue
			const failedPieces = Array.isArray(event.data.failedPieces) ? event.data.failedPieces : []
			if (
				event.data.state === 'completed' &&
				event.data.result === 'ok' &&
				failedPieces.length === 0
			) {
				return { state: 'completed', jobId }
			}
			return failure('job', publicationFailureDetail(event.data.errors, failedPieces), jobId)
		}
		if (signal.aborted) return
		return failure('connection', '', jobId)
	} catch (error) {
		if (!signal.aborted) return failure('connection', messageDetail(error), jobId)
	}
}

export async function submitPublication(
	action: PublicationAction,
	filePath: string,
	signal: AbortSignal
): Promise<PublicationOutcome | undefined> {
	if (signal.aborted) return
	try {
		const response = await fetch(`/api/admin/${action}`, {
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
		return observePublicationJob(action, accepted.jobId, signal)
	} catch (error) {
		if (!signal.aborted) return failure('request', messageDetail(error))
	}
}
