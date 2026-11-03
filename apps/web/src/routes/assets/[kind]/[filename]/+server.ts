import { siteImageDefaults } from '@luzzle/web.config'
import { configuredAssetFilename } from '@luzzle/web.config/asset-urls'
import { config } from '#lib/server/config.js'
import { siteAssetNotFound } from '#lib/server/assets/responses.js'
import { createSiteFontHandler } from '#lib/server/assets/fonts.js'
import { createSiteImageHandler } from '#lib/server/assets/images.js'
import type { RequestHandler } from './$types'

const fontResponse = createSiteFontHandler(config)
const imageResponse = createSiteImageHandler(config)

export const GET: RequestHandler = ({ params, request }) => {
	const { kind, filename } = params
	if (kind === 'fonts') {
		const source = config.content.fonts.sans
		if (!source || configuredAssetFilename(source) !== filename)
			return siteAssetNotFound(request.method)
		return fontResponse(request)
	}
	if (kind !== 'favicon' && kind !== 'opengraph') return siteAssetNotFound(request.method)
	const source = config.content.images[kind]
	if (source === siteImageDefaults[kind] || configuredAssetFilename(source) !== filename)
		return siteAssetNotFound(request.method)
	return imageResponse(kind, request)
}

export const HEAD = GET
