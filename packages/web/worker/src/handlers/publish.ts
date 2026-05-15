import { Job } from '@sidequest/core'
import { getWorkerContext } from './context.js'
import { ArchiveSync } from './archive-sync.js'
import { LuzzleSync } from './luzzle-sync.js'
import { WebSync } from './web-sync.js'
import { AssetsGenerate } from './assets-generate.js'
import { CdnSync } from './cdn-sync.js'
import { CachePurge } from './cache-purge.js'

export class Publish extends Job {
	async run(): Promise<string> {
		const { logger } = getWorkerContext()
		logger.info('publish starting')

		await new ArchiveSync().run()
		logger.info('publish phase done: archive.sync')

		const { changedPaths } = await new LuzzleSync().run()
		logger.info('publish phase done: luzzle.sync', { changed: changedPaths.length })

		await new WebSync().run({ filePaths: changedPaths })
		logger.info('publish phase done: web.sync')

		await new AssetsGenerate().run({ filePaths: changedPaths })
		logger.info('publish phase done: assets.generate')

		await new CdnSync().run()
		logger.info('publish phase done: cdn.sync')

		await new CachePurge().run()
		logger.info('publish phase done: cache.purge')

		logger.info('publish complete')
		return 'ok'
	}
}
