import { createHash } from 'node:crypto'

// Local copy of generateAssetKey. The same 7 lines also live in
// @luzzle/web/explorer (src/lib/pieces/assets.key.server.ts) and in
// @luzzle/web.utils. Worker and explorer must produce IDENTICAL keys
// since worker writes the asset rows and explorer reads them. Tests on
// both sides lock the hash format; if you change one, change all.
export function generateAssetKey(filePath: string, salt?: string): string {
	const normalizedPath = filePath.replace(/\\/g, '/')
	return createHash('sha256')
		.update(normalizedPath + (salt || ''))
		.digest('hex')
}
