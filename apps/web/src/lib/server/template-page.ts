import type { TemplateBundleModule } from '@luzzle/web.templates/bundle'
import type { NavBannerColors } from '@luzzle/web.templates/components/props'
import type { TemplateUrlBuilders } from '$lib/pieces/template-helpers.js'
import { createPageTemplateHelpers } from './template-helpers.js'

export function renderTemplatePage(
	bundle: TemplateBundleModule,
	name: string,
	data: object,
	urls: TemplateUrlBuilders
) {
	let navBanner: NavBannerColors | null = null
	const helpers = createPageTemplateHelpers(urls, (colors) => {
		navBanner = colors
	})
	const rendered = bundle.render(name, { data, helpers })
	return { ...rendered, navBanner }
}
