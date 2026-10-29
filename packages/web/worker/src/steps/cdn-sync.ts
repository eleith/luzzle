import { completed, skipped, type Step, type StepResult } from '../core/step.js'
import { getRcloneRemoteOptions } from '../services/rclone.js'

export const cdnSyncStep: Step<void, void> = {
	name: 'cdn.sync',
	async run(_input, ctx): Promise<StepResult<void>> {
		const { config, logger, rclone } = ctx

		const options = getRcloneRemoteOptions(config.sync, 'cdn')

		if (!options?.remote || !options.remotePath) {
			logger.info('cdn.sync skipped: sync.cdn.remote or sync.cdn.path not configured')
			return skipped('sync.cdn.remote or sync.cdn.path not configured')
		}

		if (!options.configPath) {
			logger.info('cdn.sync skipped: sync.config not configured')
			return skipped('sync.config not configured')
		}

		const { remote, remotePath } = options
		const localPath = config.paths.assets
		const strategy = config.sync.cdn?.strategy ?? 'sync'

		logger.info(`cdn.sync starting ${strategy}`, { localPath, remote, remotePath, strategy })

		if (strategy === 'copy') {
			await rclone.copy({ ...options, localPath })
		} else {
			await rclone.sync({ ...options, localPath })
		}

		logger.info('cdn.sync complete')
		return completed(undefined)
	},
}
