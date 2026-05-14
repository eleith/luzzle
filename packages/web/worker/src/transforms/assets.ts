import { generateAssetKey } from '../assets/key.js'

export function buildAssetMaps(
	assetsJsonArray: string | undefined,
	salt: string
): { pathToKey: Map<string, string>; keyToPath: Map<string, string> } {
	const assetPaths: string[] = JSON.parse(assetsJsonArray || '[]')
	const pathToKey = new Map<string, string>()
	const keyToPath = new Map<string, string>()

	for (const assetPath of assetPaths) {
		const key = generateAssetKey(assetPath, salt)
		pathToKey.set(assetPath, key)
		keyToPath.set(key, assetPath)
	}

	return { pathToKey, keyToPath }
}
