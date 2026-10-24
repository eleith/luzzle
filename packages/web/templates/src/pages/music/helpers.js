import { safeExternalUrl } from '@luzzle/web.pieces';

/** @param {import('./schema.js').Fields} fields */
export function getMusicLinks(fields) {
	const links = [];
	const source = safeExternalUrl(fields.url);
	if (source) links.push({ label: 'source', href: source });
	if (fields.youtubeId) {
		links.push({
			label: 'youtube',
			href: `https://music.youtube.com/watch?v=${encodeURIComponent(fields.youtubeId)}`
		});
	}
	if (fields.spotifyId) {
		links.push({
			label: 'spotify',
			href: `https://open.spotify.com/track/${encodeURIComponent(fields.spotifyId)}`
		});
	}
	const appleMusic = safeExternalUrl(fields.appleMusicUrl);
	if (appleMusic) links.push({ label: 'apple music', href: appleMusic });
	if (fields.isrc) {
		links.push({
			label: 'musicbrainz',
			href: `https://musicbrainz.org/isrc/${encodeURIComponent(fields.isrc)}`
		});
	}
	return links;
}
