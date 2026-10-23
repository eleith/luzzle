import type { PreparedPage } from '$lib/content/types.js'
import type { NavBannerColors } from '@luzzle/web.templates/components/props'
import type { TemplateUrlBuilders } from '$lib/pieces/template-helpers.js'
import { createPageTemplateHelpers } from './template-helpers.js'
import type { LoadedTemplateBundle } from './templates.js'

export function renderTemplatePage(
	bundle: LoadedTemplateBundle,
	name: string,
	data: object,
	urls: TemplateUrlBuilders
): PreparedPage {
	let navBanner: NavBannerColors | null = null
	const helpers = createPageTemplateHelpers(urls, (colors) => {
		navBanner = colors
	})
	const rendered = bundle.render(name, { data: structuredClone(data), helpers })
	return {
		revision: bundle.revision,
		body: rendered.body,
		head: `${rendered.head}<style data-prepared-theme>${bundle.themeCss}</style>`,
		navBanner
	}
}
