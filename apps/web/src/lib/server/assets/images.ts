import path from 'node:path'
import { siteImageDefaults, type Config } from '@luzzle/web.config'
import { readConfiguredAsset } from '@luzzle/web.config/assets'
import { configuredAssetUrl } from '@luzzle/web.config/asset-urls'
import { absoluteSiteImage, type SiteImage, type SiteImageUrls } from '#lib/site-images.js'
import { createSiteAssetHandler, siteAssetNotFound } from './responses.js'

const imageTypes: Record<SiteImage, Readonly<Record<string, string>>> = {
	favicon: { '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' },
	opengraph: {
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.webp': 'image/webp',
		'.gif': 'image/gif'
	}
}

type ImageConfig = Pick<Config, 'content' | 'paths'>
export function siteImageUrls(
	config: Pick<Config, 'content' | 'url'>,
	requestUrl: URL
): SiteImageUrls {
	const prefix = config.url.app_assets.replace(/\/+$/, '')
	function imageUrl(image: SiteImage): string {
		const source = config.content.images[image]
		return source === siteImageDefaults[image]
			? `${prefix}${source}`
			: configuredAssetUrl(image, source)
	}
	return {
		favicon: imageUrl('favicon'),
		opengraph: absoluteSiteImage(imageUrl('opengraph'), config.url.app, requestUrl)
	}
}

async function loadImage(config: ImageConfig, image: SiteImage) {
	const source = config.content.images[image]
	if (source === siteImageDefaults[image]) return
	const contentType = imageTypes[image][path.extname(source).toLowerCase()]
	if (!contentType) return
	const bytes = await readConfiguredAsset(config, source)
	return bytes ? { bytes, contentType } : undefined
}

export function createSiteImageHandler(config: ImageConfig) {
	const handlers = {
		favicon: createSiteAssetHandler(() => loadImage(config, 'favicon')),
		opengraph: createSiteAssetHandler(() => loadImage(config, 'opengraph'))
	}
	return (image: string, request: Request): Promise<Response> => {
		if (image !== 'favicon' && image !== 'opengraph')
			return Promise.resolve(siteAssetNotFound(request.method))
		return handlers[image](request)
	}
}
