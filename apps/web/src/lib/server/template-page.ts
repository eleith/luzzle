import type { TemplateBundleModule } from '@luzzle/web.templates/bundle'
import type { NavBannerColors } from '@luzzle/web.templates/components/props'
import { createPageTemplateHelpers, type TemplateUrlBuilders } from './template-helpers.js'

export function renderTemplatePage(
	bundle: TemplateBundleModule,
	name: string,
	data: object,
	urls: TemplateUrlBuilders
) {
	let navigation: NavBannerColors | undefined
	const helpers = createPageTemplateHelpers(urls, (colors) => {
		navigation = colors
	})
	const rendered = bundle.render(name, { data, helpers })
	return { ...rendered, navigation }
}
