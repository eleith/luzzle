import { config, type AppConfigPublic } from '$lib/server/config'
import { getConfiguredPieceTypes } from '$lib/pieces/types.server.js'

export const load = async () => {
	return {
		pieceTypes: getConfiguredPieceTypes(),
		config: {
			content: {
				text: {
					title: config.content.text.title,
					description: config.content.text.description
				}
			},
			url: {
				app: config.url.app,
				app_assets: config.url.app_assets,
				luzzle_assets: config.url.luzzle_assets
			}
		} satisfies AppConfigPublic,
		meta: {
			title: config.content.text.title,
			description: config.content.text.description
		}
	}
}
