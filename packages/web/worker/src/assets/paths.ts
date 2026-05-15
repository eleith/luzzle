// Pure string helpers shared by the worker's transform handlers (attachment,
// image, opengraph, ...). Worker writes asset files at these paths; explorer
// reads them at the same paths from the web db.

export const ASSET_PATH_MATCHER = /^(?:.*[\\/])?(([^/\\]+?)(?:\.([^.]+))?)$/

export const ASSET_SIZES = {
	s: 125,
	m: 250,
	l: 500,
	xl: 1000
} as const

export function getAssetDir(type: string, key: string): string {
	return `${type}/${key}`
}

export function getAssetPath(type: string, key: string, asset: string): string {
	const dir = getAssetDir(type, key)
	const match = asset.match(ASSET_PATH_MATCHER)
	const filename = match ? match[1] : asset
	return `${dir}/${filename}`
}

export function getImageAssetPath(
	type: string,
	key: string,
	asset: string,
	width: number,
	format: 'jpg' | 'avif' | 'webp' | 'png'
): string {
	const match = asset.match(ASSET_PATH_MATCHER)
	const filename = match ? match[1] : asset
	const basename = match ? match[2] : filename
	const dir = getAssetDir(type, key)
	const size = width <= 125 ? 's' : width <= 250 ? 'm' : width <= 500 ? 'l' : 'xl'

	return `${dir}/${basename}.${size}.${format}`
}

export function getOpenGraphPath(type: string, key: string): string {
	return `${type}/${key}/opengraph.png`
}
