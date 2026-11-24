import { config } from '#lib/server/config.js'
import { publishedIconContext, renderAuthoredIcon } from '#lib/server/templates/icon.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
	const { piece } = await parent()
	const renderedIcon = await renderAuthoredIcon(
		piece,
		config,
		{ size: { width: 500 }, lazy: false },
		publishedIconContext(config)
	)
	return { renderedIcon }
}
