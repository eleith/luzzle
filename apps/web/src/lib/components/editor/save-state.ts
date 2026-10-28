export type SaveSnapshot = { file: string; content: string }

export function reconcileSourceRefresh(
	content: string,
	previous: SaveSnapshot,
	refreshed: SaveSnapshot,
	savePending: boolean
): string {
	if (refreshed.file !== previous.file || (!savePending && content === previous.content)) {
		return refreshed.content
	}
	return content
}

type SaveResult = { type: 'success'; content: string } | { type: 'failure'; content?: string }

export function reconcileSave(
	current: SaveSnapshot,
	submitted: SaveSnapshot,
	result: SaveResult
): string {
	if (
		result.type === 'failure' ||
		current.file !== submitted.file ||
		current.content !== submitted.content
	) {
		return current.content
	}
	return result.content
}
