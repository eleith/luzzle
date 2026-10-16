import { expect, test } from 'vitest'
import { MarkdownPublicationStatus } from '$lib/pieces/types'
import { getViewAvailability, shouldOfferPublish } from './view-state'

test.each([
	[false, false, { published: false, preview: true }],
	[true, false, { published: true, preview: true }],
	[false, true, { published: false, preview: false }],
	[true, true, { published: false, preview: false }]
])('availability: published row=%s, saving=%s', (hasPublishedVersion, isSaving, expected) => {
	expect(getViewAvailability(hasPublishedVersion, isSaving)).toEqual(expected)
})

test.each([
	[false, MarkdownPublicationStatus.MATCHING, true],
	[false, MarkdownPublicationStatus.CHANGED, true],
	[false, MarkdownPublicationStatus.UNKNOWN, true],
	[true, MarkdownPublicationStatus.MATCHING, false],
	[true, MarkdownPublicationStatus.CHANGED, true],
	[true, MarkdownPublicationStatus.UNKNOWN, true]
])('publish offer: published row=%s, status=%s', (hasPublishedVersion, status, expected) => {
	expect(shouldOfferPublish(hasPublishedVersion, status)).toBe(expected)
})
