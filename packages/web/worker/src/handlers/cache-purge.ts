import { Job } from '@sidequest/core'
import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import type { HandlerContext } from './context.js'

export class CachePurge extends Job {
	async run(ctx: HandlerContext): Promise<string> {
		const { config, logger } = ctx
		const cacheDir = config.paths.cache

		let entries: string[]
		try {
			entries = await readdir(cacheDir)
		} catch (err) {
			const code = (err as NodeJS.ErrnoException).code
			if (code === 'ENOENT') {
				logger.info('cache.purge skipped: cache directory does not exist', { cacheDir })
				return 'skipped'
			}
			throw err
		}

		logger.info('cache.purge starting', { cacheDir, entries: entries.length })

		for (const entry of entries) {
			await rm(path.join(cacheDir, entry), { recursive: true, force: true })
		}

		logger.info('cache.purge complete')
		return 'ok'
	}
}
