import type { PageServerLoad } from './$types'
import { renderPreparedPiecePage } from '$lib/server/piece-page.js'

export const load: PageServerLoad = async ({ parent, url }) => {
	const { piece, tags } = await parent()
	return { presentation: await renderPreparedPiecePage({ piece, tags, url }) }
}
