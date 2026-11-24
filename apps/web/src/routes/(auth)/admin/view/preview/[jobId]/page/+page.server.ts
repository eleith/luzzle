import { config } from '#lib/server/config.js'
import { renderAuthoredPage } from '#lib/server/templates/page.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
	const { status, piece, tags, job } = await parent()
	if (status !== 'completed' || !piece) return { renderedPage: null, pageUnavailable: true }

	const renderedPage = await renderAuthoredPage(piece, tags ?? [], config, {
		mode: 'preview',
		appUrl: config.url.app,
		job
	})
	return { renderedPage }
}
