import { resolvePreparedDirectory } from '@luzzle/web.config'
import type { FeedPageProps } from '@luzzle/web.templates/site/props'
import type { PreparedPage } from '$lib/content/types.js'
import { createTemplateUrlBuilders } from '$lib/pieces/urls.server.js'
import { config } from '$lib/server/config'
import { loadTemplateBundle } from '$lib/server/templates.js'
import { renderTemplatePage } from '$lib/server/template-page.js'

type FeedPageRequest = FeedPageProps['data'] & { url: URL }

export async function renderPreparedFeedPage({
	feed,
	pieces,
	url
}: FeedPageRequest): Promise<PreparedPage | null> {
	if (!config.paths.config) return null
	try {
		const bundle = await loadTemplateBundle(resolvePreparedDirectory(config))
		if (!bundle || !Object.hasOwn(bundle.templateLookup.site, 'feed')) return null
		const name = bundle.templateLookup.site.feed
		if (!name) return null
		const rendered = renderTemplatePage(
			bundle,
			name,
			structuredClone({ feed, pieces }),
			createTemplateUrlBuilders(url)
		)
		return {
			revision: bundle.revision,
			body: rendered.body,
			head: `${rendered.head}<style data-prepared-theme>${bundle.themeCss}</style>`,
			navBanner: rendered.navBanner
		}
	} catch (error) {
		console.error(`Prepared feed rendering failed for ${feed.type}: ${feed.label}`, error)
		return null
	}
}
