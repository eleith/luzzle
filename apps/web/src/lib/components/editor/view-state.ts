import { MarkdownPublicationStatus } from '$lib/pieces/types'

export function getViewAvailability(hasPublishedVersion: boolean, isSaving: boolean) {
	return {
		published: hasPublishedVersion && !isSaving,
		preview: !isSaving
	}
}

export function shouldOfferPublish(
	hasPublishedVersion: boolean,
	status: MarkdownPublicationStatus
): boolean {
	return !hasPublishedVersion || status !== MarkdownPublicationStatus.MATCHING
}
