import path from 'node:path'
import type { Config } from '@luzzle/web.config'
import { configuredAssetFilename } from '@luzzle/web.config/asset-urls'
import { readConfiguredAsset } from '@luzzle/web.config/assets'
import { createSiteAssetHandler } from './responses.js'

type FontConfig = Pick<Config, 'content' | 'paths'>

async function loadFont(config: FontConfig, filename: string) {
	if (path.extname(filename).toLowerCase() !== '.woff2') return

	// The URL names a public file. Only configuration can supply its disk path.
	let source: string | undefined
	for (const configuredPath of Object.values(config.content.fonts)) {
		if (!configuredPath || configuredAssetFilename(configuredPath) !== filename) continue
		// Both roles can use one file, but one URL cannot serve two different files.
		if (source && source !== configuredPath) return
		source = configuredPath
	}
	if (!source) return

	const bytes = await readConfiguredAsset(config, source)
	return bytes ? { bytes, contentType: 'font/woff2' } : undefined
}

export function createSiteFontHandler(config: FontConfig) {
	return (filename: string, request: Request) => {
		const respond = createSiteAssetHandler(() => loadFont(config, filename))
		return respond(request)
	}
}
