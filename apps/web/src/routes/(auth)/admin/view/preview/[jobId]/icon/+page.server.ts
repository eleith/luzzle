import { config } from '#lib/server/config.js'
import { renderAuthoredIcon } from '#lib/server/templates/icon.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ parent }) => {
	const { status, piece, job } = await parent()
	if (status !== 'completed' || !piece) return { renderedIcon: undefined }

	const renderedIcon = await renderAuthoredIcon(
		piece,
		config,
		{ size: { width: 500 }, lazy: false },
		{ mode: 'preview', appUrl: config.url.app, job }
	)
	return { renderedIcon }
}
