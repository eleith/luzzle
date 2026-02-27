const ASSET_PATH_MATCHER = /^(?:.*[\\/])?(([^/\\]+?)(?:\.([^.]+))?)$/
const OpengraphImageWidth = 1200
const OpengraphImageHeight = 630
const ASSET_SIZES = {
	s: 125,
	m: 250,
	l: 500,
	xl: 1000,
} as const

function getOpenGraphPath(type: string, key: string) {
	return `${type}/${key}/opengraph.png`
}

function getAssetDir(type: string, key: string) {
	return `${type}/${key}`
}

function getImageAssetPath(
	type: string,
	key: string,
	asset: string,
	width: number,
	format: 'jpg' | 'avif' | 'webp' | 'png'
) {
	const match = asset.match(ASSET_PATH_MATCHER)
	const filename = match ? match[1] : asset
	const basename = match ? match[2] : filename
	const dir = getAssetDir(type, key)
	const size = width <= 125 ? 's' : width <= 250 ? 'm' : width <= 500 ? 'l' : 'xl' 

	return `${dir}/${basename}.${size}.${format}`
}

function getAssetPath(type: string, key: string, asset: string) {
	const dir = getAssetDir(type, key)
	const match = asset.match(ASSET_PATH_MATCHER)
	/* v8 ignore next */
	const filename = match ? match[1] : asset

	return `${dir}/${filename}`
}

export {
	getOpenGraphPath,
	getAssetDir,
	getImageAssetPath,
	getAssetPath,
	ASSET_SIZES,
	ASSET_PATH_MATCHER,
	OpengraphImageWidth,
	OpengraphImageHeight,
}
