const ASSET_IMAGE_MATCHER = /\.(jpg|jpeg|png|webp|avif|gif)$/i
const ASSET_PATH_MATCHER = /^(?:.*[\\/])?(([^/\\]+?)(?:\.([^.]+))?)$/
const ASSET_SIZES = {
	s: 125,
	m: 250,
	l: 500,
	xl: 1000,
}

function isImage(asset: string) {
	const match = asset.match(ASSET_PATH_MATCHER)
	const filename = match ? match[1] : asset
	return ASSET_IMAGE_MATCHER.test(filename)
}

function getAssetDir(type: string, id: string) {
	return `${type}/${id}`
}

function getAssetPath(
	type: string,
	id: string,
	asset: string,
	options?: { format?: 'jpg' | 'avif'; size?: keyof typeof ASSET_SIZES }
) {
	const match = asset.match(ASSET_PATH_MATCHER)
	const filename = match ? match[1] : asset
	const basename = match ? match[2] : filename
	const dir = getAssetDir(type, id)

	if (options?.size && options?.format && isImage(asset)) {
		return `${dir}/${basename}.${options.size}.${options.format}`
	} else {
		return `${dir}/${filename}`
	}
}

export { getAssetPath, isImage, getAssetDir, ASSET_SIZES }
