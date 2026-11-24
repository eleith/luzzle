import { config } from '#lib/server/config.js'
import { renderAuthoredOpengraph } from '#lib/server/templates/opengraph.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
	const { status, piece, job } = await parent()
	if (status !== 'completed' || !piece) return { renderedOpengraph: null, shareUnavailable: true }

	const renderedOpengraph = await renderAuthoredOpengraph(piece, config, {
		mode: 'preview',
		appUrl: config.url.app,
		job
	})
	return { renderedOpengraph, shareUnavailable: false }
}
