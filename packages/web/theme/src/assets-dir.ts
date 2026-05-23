import { statSync } from 'node:fs'
import path from 'node:path'

export function getAssetsDir(): string {
	if (process.env.LUZZLE_THEME_ASSETS_DIR) {
		const envPath = process.env.LUZZLE_THEME_ASSETS_DIR
		try {
			if (statSync(envPath).isDirectory()) {
				return envPath
			}
		} catch {
			// Ignore
		}
	}

	const assetsPath = path.resolve(import.meta.dirname, '../../assets')
	try {
		if (statSync(assetsPath).isDirectory()) {
			return assetsPath
		}
	} catch {
		// Ignore
	}

	return assetsPath
}
