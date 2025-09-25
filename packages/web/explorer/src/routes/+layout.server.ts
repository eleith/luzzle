import { config, type AppConfigPublic } from '$lib/server/config'

export const load = async () => {
	return {
		config: {
			text: {
				title: config.text.title,
				description: config.text.description
			},
			url: {
				app: config.url.app,
				app_assets: config.url.app_assets,
				luzzle_assets: config.url.luzzle_assets
			}
		} as AppConfigPublic,
		meta: { 
			title: config.text.title, 
			description: config.text.description 
		}
	}
}
