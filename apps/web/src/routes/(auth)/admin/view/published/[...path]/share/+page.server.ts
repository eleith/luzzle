import { config } from '#lib/server/config.js'
import { renderAuthoredOpengraph } from '#lib/server/templates/opengraph.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
	const { piece } = await parent()
	const renderedOpengraph = await renderAuthoredOpengraph(piece, config)
	return { renderedOpengraph }
}
