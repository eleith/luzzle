import { config, type AppConfigPublic } from '#lib/server/config.js'
import { siteImageUrls } from '#lib/server/site-images.js'
import { getConfiguredPieceTypes } from '#lib/pieces/types.server.js'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals, url }) => {
	locals.inlineConfiguredStyles()
	const publicConfig: AppConfigPublic = {
		content: {
			text: {
				title: config.content.text.title,
				description: config.content.text.description
			},
			images: siteImageUrls(config, url)
		},
		url: {
			app: config.url.app,
			app_assets: config.url.app_assets,
			luzzle_assets: config.url.luzzle_assets
		}
	}
	return {
		pieceTypes: getConfiguredPieceTypes(),
		config: publicConfig,
		meta: {
			title: config.content.text.title,
			description: config.content.text.description
		}
	}
}
