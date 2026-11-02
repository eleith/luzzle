import { resolveAppOrigin } from '../../scripts/runtime-environment.js'

export type SiteImage = 'favicon' | 'opengraph'
export type SiteImageUrls = Record<SiteImage, string>

export function absoluteSiteImage(
	image: string,
	appUrl: string,
	requestUrl: Pick<URL, 'href'>
): string {
	const base = resolveAppOrigin(appUrl) ? appUrl : new URL('/', requestUrl.href)
	return new URL(image, base).href
}
