import { testConnectivitySpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow } from '@luzzle/web.jobs'
import type { TestConnectivityResult } from '@luzzle/web.jobs'
import { getWorkerContext } from '../services/context.js'
import { getRcloneRemoteOptions } from '../services/rclone.js'

export function registerTestConnectivityWorkflow(): void {
	const openWorkflow = getOpenWorkflow()

	openWorkflow.implementWorkflow(
		testConnectivitySpec,
		async ({ input }): Promise<TestConnectivityResult> => {
			const { config, rclone, logger } = getWorkerContext()
			const options = getRcloneRemoteOptions(config.sync, input.target)

			if (!options?.remote || !options.remotePath || !options.configPath) {
				return { ok: false, reason: `sync.${input.target} is not fully configured` }
			}

			logger.info(`connectivity check starting for ${input.target}`, { remote: options.remote })

			return rclone.checkConnectivity({
				remote: options.remote,
				remotePath: options.remotePath,
				configPath: options.configPath,
			})
		}
	)
}
