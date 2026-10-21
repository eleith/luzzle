import type { NavBannerColors } from '@luzzle/web.templates/components/props'
import type { PageTemplateHelpers } from '@luzzle/web.templates/helpers'
import { createTemplateHelpers, type TemplateUrlBuilders } from '$lib/pieces/template-helpers.js'

export function createPageTemplateHelpers(
	urls: TemplateUrlBuilders,
	onNavigation: (colors: NavBannerColors) => void
): PageTemplateHelpers {
	return {
		...createTemplateHelpers(urls),
		showNavBanner(colors = {}) {
			const snapshot = {
				background: colors.background,
				color: colors.color,
				hoverColor: colors.hoverColor
			}
			onNavigation(
				Object.fromEntries(Object.entries(snapshot).filter(([, value]) => value !== undefined))
			)
		}
	}
}
