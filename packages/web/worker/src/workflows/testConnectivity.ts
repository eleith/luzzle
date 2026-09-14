import { testConnectivitySpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow } from '@luzzle/web.jobs'
import type { TestConnectivityResult } from '@luzzle/web.jobs'
import { getWorkerContext } from '../services/context.js'

export function registerTestConnectivityWorkflow(): void {
	const openWorkflow = getOpenWorkflow()

	openWorkflow.implementWorkflow(
		testConnectivitySpec,
		async ({ input }): Promise<TestConnectivityResult> => {
			const { config, rclone, logger } = getWorkerContext()
			const sync = input.target === 'archive' ? config.sync.archive : config.sync.cdn
			const configPath = config.sync.config

			if (!sync?.remote || !sync?.path || !configPath) {
				return { ok: false, reason: `sync.${input.target} is not fully configured` }
			}

			logger.info(`connectivity check starting for ${input.target}`, { remote: sync.remote })

			return rclone.checkConnectivity({
				remote: sync.remote,
				remotePath: sync.path,
				configPath,
			})
		}
	)
}
