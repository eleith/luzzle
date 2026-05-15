import { Job } from '@sidequest/core'
import { getWorkerContext } from './context.js'
import { ArchiveSync } from './archive-sync.js'
import { LuzzleSync } from './luzzle-sync.js'
import { WebSync } from './web-sync.js'
import { AssetsGenerate } from './assets-generate.js'
import { CdnSync } from './cdn-sync.js'
import { CachePurge } from './cache-purge.js'

type PhaseHandler = { new (): { run: () => Promise<string> } }

const PHASES: ReadonlyArray<readonly [string, PhaseHandler]> = [
	['archive.sync', ArchiveSync],
	['luzzle.sync', LuzzleSync],
	['web.sync', WebSync],
	['assets.generate', AssetsGenerate],
	['cdn.sync', CdnSync],
	['cache.purge', CachePurge],
]

export class Publish extends Job {
	async run(): Promise<string> {
		const ctx = getWorkerContext()
		ctx.logger.info('publish starting')

		for (const [name, Handler] of PHASES) {
			ctx.logger.info(`publish phase starting: ${name}`)
			const handler = new Handler()
			const result = await handler.run()
			ctx.logger.info(`publish phase done: ${name}`, { result })
		}

		ctx.logger.info('publish complete')
		return 'ok'
	}
}
