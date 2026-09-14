import { config } from '$lib/server/config'
import { probeStorage } from '$lib/server/health/probes.js'
import { testConnectivity } from '$lib/server/health/testConnectivity.js'
import {
	loadHealthPage,
	probeWorkerIfConfigured,
	probeOidcIssuerIfConfigured
} from '$lib/server/load/health.js'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = () => loadHealthPage()

export const actions = {
	testStorage: async () => ({ result: await probeStorage(config.storage.root) }),
	testWorker: async () => ({ result: await probeWorkerIfConfigured(config) }),
	testOidcIssuer: async () => ({ result: await probeOidcIssuerIfConfigured(config) }),
	testArchive: async () => ({ result: await testConnectivity('archive') }),
	testCdn: async () => ({ result: await testConnectivity('cdn') })
} satisfies Actions
