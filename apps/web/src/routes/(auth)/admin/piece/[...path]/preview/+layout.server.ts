import type { LayoutServerLoad } from './$types'
import { db } from '#lib/server/database/index.js'
import { getWebPiece } from '#lib/server/pieces.js'

export const load: LayoutServerLoad = async ({ locals, params }) => {
	locals.inlineConfiguredStyles()
	const published = await getWebPiece(db, params.path)
	return { hasPublishedVersion: !!published }
}
