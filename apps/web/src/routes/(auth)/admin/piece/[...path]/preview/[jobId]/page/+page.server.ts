import type { PageServerLoad } from './$types'
import { renderPreparedPiecePage } from '$lib/server/piece-page.js'

export const load: PageServerLoad = async ({ parent, url, params }) => {
	const data = await parent()
	if (data.status !== 'completed' || !data.piece) return { presentation: null }
	return {
		presentation: await renderPreparedPiecePage({
			piece: data.piece,
			tags: data.tags ?? [],
			url,
			previewJob: params.jobId
		})
	}
}
