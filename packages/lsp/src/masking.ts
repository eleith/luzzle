/**
 * Masks the markdown body of a document, preserving only the YAML frontmatter.
 *
 * - Opening `---` must be on line 0.
 * - Closing `---` is the next line matching exactly `---` (with optional trailing whitespace).
 * - Everything after the closing delimiter has non-newline characters replaced with spaces.
 * - If no valid frontmatter is found, the entire document is masked.
 *
 * Line/character coordinates are preserved 1:1 because only visible characters
 * are replaced — newlines stay in place.
 */
export function maskDocument(text: string): string {
	const firstNewline = text.indexOf('\n')
	const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline)

	// Opening --- must be on line 0
	if (firstLine.trim() !== '---') {
		return text.replace(/[^\n\r]/g, ' ')
	}

	// Find closing --- after the first line
	const afterFirstLine = text.slice(firstNewline + 1)
	const closingMatch = afterFirstLine.match(/^---[ \t]*$/m)

	if (!closingMatch || closingMatch.index === undefined) {
		// Unclosed frontmatter — mask everything
		return text.replace(/[^\n\r]/g, ' ')
	}

	// Preserve everything up to and including the closing ---
	const closingEnd = firstNewline + 1 + closingMatch.index + closingMatch[0].length
	const preserved = text.slice(0, closingEnd - closingMatch[0].length) + closingMatch[0].replace('---', '...')
	const body = text.slice(closingEnd)

	return preserved + body.replace(/[^\n\r]/g, ' ')
}
