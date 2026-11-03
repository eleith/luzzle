/** POSIX basename of a configured source; only this filename is public. */
export function configuredAssetFilename(source: string): string {
	const trimmed = source.replace(/\/+$/, "");
	return trimmed.slice(trimmed.lastIndexOf("/") + 1);
}

/** Browser-safe URL construction, independent of filesystem access. */
export function configuredAssetUrl(
	kind: "favicon" | "opengraph" | "fonts",
	source: string,
): string {
	return `/assets/${kind}/${encodeURIComponent(configuredAssetFilename(source))}`;
}
