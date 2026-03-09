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
