import { config } from '$lib/server/config'
import { buildHealthConfigSummary } from '$lib/server/health.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
	return {
		meta: { title: `health | ${config.content.text.title}` },
		configSummary: buildHealthConfigSummary(config)
	}
}
