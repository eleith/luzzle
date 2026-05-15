import { Job } from '@sidequest/core'
import { getWorkerContext } from './context.js'

export class CdnSync extends Job {
	async run(): Promise<string> {
		const ctx = getWorkerContext()
		const { config, logger, rclone } = ctx

		const remote = config.sync.cdn?.remote
		const remotePath = config.sync.cdn?.path
		const configPath = config.sync.config

		if (!remote || !remotePath) {
			logger.info('cdn.sync skipped: sync.cdn.remote or sync.cdn.path not configured')
			return 'skipped'
		}

		if (!configPath) {
			logger.info('cdn.sync skipped: sync.config not configured')
			return 'skipped'
		}

		const localPath = config.paths.assets

		logger.info('cdn.sync starting copy', { localPath, remote, remotePath })

		await rclone.copy({
			localPath,
			remote,
			remotePath,
			configPath,
		})

		logger.info('cdn.sync complete')
		return 'ok'
	}
}
