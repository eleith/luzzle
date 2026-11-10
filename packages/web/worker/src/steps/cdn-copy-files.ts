import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { resolveGeneratedAssetFile } from '../assets/files.js'
import { completed, skipped, type Step, type StepResult } from '../core/step.js'
import { getRcloneRemoteOptions } from '../services/rclone.js'

export const cdnCopyFilesStep: Step<{ filePaths: string[] }, void> = {
	name: 'cdn.copy-files',
	async run({ filePaths }, ctx): Promise<StepResult<void>> {
		const { config, logger, rclone } = ctx
		const options = getRcloneRemoteOptions(config.sync, 'cdn')

		if (!options?.remote || !options.remotePath) {
			logger.info('cdn.copy-files skipped: sync.cdn.remote or sync.cdn.path not configured')
			return skipped('sync.cdn.remote or sync.cdn.path not configured')
		}
		if (!options.configPath) {
			logger.info('cdn.copy-files skipped: sync.config not configured')
			return skipped('sync.config not configured')
		}

		const uniquePaths = [...new Set(filePaths)]
		if (uniquePaths.length === 0) return completed(undefined)

		const root = await realpath(config.paths.assets)
		const files: { localPath: string; remotePath: string }[] = []
		// Validate the entire manifest before transferring anything. The resolver rejects
		// symlink components as well as noncanonical/escaping relative paths.
		for (const filePath of uniquePaths) {
			const localPath = await resolveGeneratedAssetFile(root, filePath)
			if (!(await stat(localPath)).isFile()) {
				throw new Error(`Generated asset is not a file: ${filePath}`)
			}
			files.push({
				localPath,
				remotePath: path.posix.join(options.remotePath, path.posix.dirname(filePath)),
			})
		}

		for (const file of files) {
			await rclone.copy({ ...options, ...file })
		}
		logger.info('cdn.copy-files complete', { files: files.length })
		return completed(undefined)
	},
}
