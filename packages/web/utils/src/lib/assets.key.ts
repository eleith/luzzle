import { createHash } from 'node:crypto'

function generateAssetKey(filePath: string, salt?: string) {
	const normalizedPath = filePath.replace(/\\/g, '/')
	return createHash('sha256')
		.update(normalizedPath + (salt || ''))
		.digest('hex')
}

export { generateAssetKey }
