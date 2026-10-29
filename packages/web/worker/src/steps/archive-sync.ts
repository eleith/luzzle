import path from 'node:path'
import { mkdir, readdir } from 'node:fs/promises'
import { completed, skipped, type Step, type StepResult } from '../core/step.js'
import { getRcloneRemoteOptions } from '../services/rclone.js'

export const archiveSyncStep: Step<void, void> = {
	name: 'archive.sync',
	async run(_input, ctx): Promise<StepResult<void>> {
		const { config, logger, rclone } = ctx

		const options = getRcloneRemoteOptions(config.sync, 'archive')

		if (!options?.remote || !options.remotePath) {
			logger.info('archive.sync skipped: sync.archive.remote or sync.archive.path not configured')
			return skipped('sync.archive.remote or sync.archive.path not configured')
		}

		if (!options.configPath) {
			logger.info('archive.sync skipped: sync.config not configured')
			return skipped('sync.config not configured')
		}

		const { remote, remotePath } = options
		const localPath = config.storage.root
		const workdir = path.resolve(localPath, '..', 'rclone', 'bisync')

		await mkdir(workdir, { recursive: true })
		const entries = await readdir(workdir).catch(() => [] as string[])
		const resync = !entries.some((f) => f.endsWith('.lst'))

		logger.info('archive.sync starting bisync', { localPath, remote, remotePath, resync })

		await rclone.bisync({ ...options, localPath, workdir, resync })

		logger.info('archive.sync complete')
		return completed(undefined)
	},
}
