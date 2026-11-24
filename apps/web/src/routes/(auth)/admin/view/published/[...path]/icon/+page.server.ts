import { config } from '#lib/server/config.js'
import { publishedIconContext, renderConfiguredIcon } from '#lib/server/templates/icon.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
	const { piece } = await parent()
	const renderedIcon = await renderConfiguredIcon(
		piece,
		config,
		{ size: { width: 500 }, lazy: false },
		publishedIconContext(config)
	)
	return { renderedIcon }
}
