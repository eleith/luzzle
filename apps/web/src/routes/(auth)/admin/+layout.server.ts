import { config } from '#lib/server/config.js'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async () => {
	return {
		meta: {
			title: `editor | ${config.content.text.title}`
		}
	}
}
