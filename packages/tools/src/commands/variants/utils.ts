const IMAGE_MATCHER = /\.(jpg|jpeg|png|webp|avif|gif)$/i
const PATH_MATCHER = /^(?:.*[\\/])?(([^/\\]+?)(?:\.([^.]+))?)$/

function isImage(asset: string) {
	const match = asset.match(PATH_MATCHER)
	const filename = match ? match[1] : asset
	return IMAGE_MATCHER.test(filename)
}

function getAssetDir(type: string, id: string) {
	return `${type}/${id}`
}

function getAssetPath(
	type: string,
	id: string,
	asset: string,
	options?: { format?: 'jpg' | 'avif'; width?: number }
) {
	const match = asset.match(PATH_MATCHER)
	const filename = match ? match[1] : asset
	const basename = match ? match[2] : filename
	const dir = getAssetDir(type, id)

	if (options?.width && options?.format && isImage(asset)) {
		return `${dir}/${basename}.w${options.width}.${options.format}`
	} else {
		return `${dir}/${filename}`
	}
}

export { getAssetPath, isImage, getAssetDir }
