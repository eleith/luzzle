/**
 * Preserve the production note estimate: five characters/word, 250 words/minute.
 * Short notes omit the reading-time label instead of displaying zero minutes.
 * @param {string | null | undefined} note
 * @returns {string | undefined}
 */
export function noteReadTime(note) {
	const minutes = Math.floor((note?.length || 0) / 5 / 250);
	return minutes > 0 ? `${minutes} min read` : undefined;
}
