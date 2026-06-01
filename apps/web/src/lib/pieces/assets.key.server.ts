import { createHash } from 'node:crypto'

export function generateAssetKey(filePath: string, salt?: string): string {
	const normalizedPath = filePath.replace(/\\/g, '/')
	return createHash('sha256')
		.update(normalizedPath + (salt || ''))
		.digest('hex')
}
