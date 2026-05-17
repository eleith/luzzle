import { completed, skipped, type Step, type StepResult } from '../core/step.js'

export const cdnSyncStep: Step<void, void> = {
	name: 'cdn.sync',
	async run(_input, ctx): Promise<StepResult<void>> {
		const { config, logger, rclone } = ctx

		const remote = config.sync.cdn?.remote
		const remotePath = config.sync.cdn?.path
		const configPath = config.sync.config

		if (!remote || !remotePath) {
			logger.info('cdn.sync skipped: sync.cdn.remote or sync.cdn.path not configured')
			return skipped('sync.cdn.remote or sync.cdn.path not configured')
		}

		if (!configPath) {
			logger.info('cdn.sync skipped: sync.config not configured')
			return skipped('sync.config not configured')
		}

		const localPath = config.paths.assets

		logger.info('cdn.sync starting sync', { localPath, remote, remotePath })

		await rclone.sync({
			localPath,
			remote,
			remotePath,
			configPath,
		})

		logger.info('cdn.sync complete')
		return completed(undefined)
	},
}
