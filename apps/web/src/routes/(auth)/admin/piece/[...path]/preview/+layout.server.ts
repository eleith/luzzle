import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = ({ locals }) => {
	locals.inlineConfiguredStyles()
	return {}
}
