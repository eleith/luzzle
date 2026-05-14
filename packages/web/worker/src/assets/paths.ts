// Asset path helpers duplicated from @luzzle/web.utils. Pure string functions
// shared by the worker's transform handlers (attachment, image, opengraph, ...).
// Worker writes asset files at these paths; explorer reads them at the same paths
// from the web db. Phase 2 will revisit whether to consolidate or keep duplicated.

export const ASSET_PATH_MATCHER = /^(?:.*[\\/])?(([^/\\]+?)(?:\.([^.]+))?)$/

export function getAssetDir(type: string, key: string): string {
	return `${type}/${key}`
}

export function getAssetPath(type: string, key: string, asset: string): string {
	const dir = getAssetDir(type, key)
	const match = asset.match(ASSET_PATH_MATCHER)
	const filename = match ? match[1] : asset
	return `${dir}/${filename}`
}
