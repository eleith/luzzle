import { Job } from '@sidequest/core'
import path from 'node:path'
import { mkdir, readdir } from 'node:fs/promises'
import { getWorkerContext } from './context.js'

export class ArchiveSync extends Job {
	async run(): Promise<string> {
		const ctx = getWorkerContext()
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

		await mkdir(workdir, { recursive: true })
		const entries = await readdir(workdir).catch(() => [] as string[])
		const resync = !entries.some((f) => f.endsWith('.lst'))

		logger.info('archive.sync starting bisync', { localPath, remote, remotePath, resync })

		await rclone.bisync({
			localPath,
			remote,
			remotePath,
			configPath,
			workdir,
			resync,
		})

		logger.info('archive.sync complete')
		return 'ok'
	}
}
