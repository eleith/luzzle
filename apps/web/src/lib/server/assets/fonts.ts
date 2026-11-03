import path from 'node:path'
import type { Config } from '@luzzle/web.config'
import { readConfiguredAsset } from '@luzzle/web.config/assets'
import { createSiteAssetHandler } from './responses.js'

export function createSiteFontHandler(config: Pick<Config, 'content' | 'paths'>) {
	return createSiteAssetHandler(async () => {
		const source = config.content.fonts.sans
		if (!source || path.extname(source).toLowerCase() !== '.woff2') return
		const bytes = await readConfiguredAsset(config, source)
		return bytes ? { bytes, contentType: 'font/woff2' } : undefined
	})
}
