import { Job } from '@sidequest/core'
import path from 'node:path'
import type { HandlerContext } from './context.js'

export class ArchiveSync extends Job {
	async run(ctx: HandlerContext): Promise<string> {
		const { config, logger, rclone } = ctx

		const remote = config.sync.archive?.remote
		const remotePath = config.sync.archive?.path
		const configPath = config.sync.config

		if (!remote || !remotePath) {
			logger.info('archive.sync skipped: sync.archive.remote or sync.archive.path not configured')
			return 'skipped'
		}

		if (!configPath) {
			logger.info('archive.sync skipped: sync.config not configured')
			return 'skipped'
		}

		const localPath = config.storage.root
		const workdir = path.resolve(localPath, '..', 'rclone', 'bisync')

		logger.info('archive.sync starting bisync', { localPath, remote, remotePath })

		await rclone.bisync({
			localPath,
			remote,
			remotePath,
			configPath,
			workdir,
		})

		logger.info('archive.sync complete')
		return 'ok'
	}
}
