/**
 * Keep the production byline compact, preferring an explicit author to a hostname.
 * @param {string | undefined} author
 * @param {string | undefined} url
 * @returns {string | undefined}
 */
export function articleBylineSource(author, url) {
	if (author) return `by ${author}`;
	if (!url) return undefined;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
		const hostname = parsed.hostname.replace(/^www\./, '').replace(/\.com$/, '');
		return hostname && hostname.length <= 25 ? hostname : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Production articles round at 250 words/minute, with a one-minute minimum.
 * An absent or zero word count does not add a reading-time label.
 * @param {number | undefined} wordCount
 * @returns {string | undefined}
 */
export function articleReadTime(wordCount) {
	if (!wordCount || !Number.isFinite(wordCount) || wordCount < 0) return undefined;
	return `${Math.max(1, Math.round(wordCount / 250))} min`;
}
