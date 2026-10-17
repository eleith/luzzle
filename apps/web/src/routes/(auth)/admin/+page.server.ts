import { loadDashboardPage } from '$lib/server/load/dashboard.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => loadDashboardPage()
