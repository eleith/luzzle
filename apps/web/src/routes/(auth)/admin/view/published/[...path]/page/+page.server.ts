import { config } from '#lib/server/config.js'
import { renderAuthoredPage } from '#lib/server/templates/page.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
	const { piece, tags } = await parent()
	const renderedPage = await renderAuthoredPage(piece, tags, config)
	return { renderedPage }
}
