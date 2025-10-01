import path from 'path'

function getVariantPath(
	type: string,
	id: string,
	asset: string,
	format?: 'jpg' | 'avif',
	size?: number
) {
	const dir = `${type}/${id}`
	if (size && format) {
		const baseName = path.basename(asset, path.extname(asset))
		return `${dir}/${baseName}.w${size}.${format}`
	} else {
		return `${dir}/${path.basename(asset)}`
	}
}

export { getVariantPath }
