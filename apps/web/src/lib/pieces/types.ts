export enum MarkdownPublicationStatus {
	MATCHING = 'matching',
	CHANGED = 'changed',
	UNKNOWN = 'unknown'
}

export type EditorPublicationStatus =
	| 'unpublished'
	| 'published'
	| 'changed'
	| 'unknown'
	| 'publishing'
	| 'unpublishing'

export interface PiecePublicationState {
	hasPublishedVersion: boolean
	markdownPublicationStatus: MarkdownPublicationStatus
}
