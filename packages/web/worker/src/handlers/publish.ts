import { Job } from '@sidequest/core'
import { getWorkerContext } from './context.js'
import { ArchiveSync } from './archive-sync.js'
import { LuzzleSync } from './luzzle-sync.js'
import { WebSync } from './web-sync.js'
import { AssetsGenerate } from './assets-generate.js'
import { CdnSync } from './cdn-sync.js'
import { CachePurge } from './cache-purge.js'
import { JobProgress } from '../lib/job-progress.js'
import { setActivePhase, clearActivePhase } from '../lib/phase-logger.js'

export class Publish extends Job {
	async run(): Promise<string> {
		const { logger, db } = getWorkerContext()
		logger.info('publish starting')

		const progress = new JobProgress(db, 2)
		try {
			await progress.purgeOld()
		} catch (err) {
			logger.error('Failed to purge old job progress', { err })
		}

		const jobId = this.id

		const phases = [
			{
				name: 'archive.sync',
				execute: async () => {
					const result = await new ArchiveSync().run()
					if (result === 'skipped') {
						await progress.skip(jobId, 'archive.sync', 'skipped')
					} else {
						await progress.complete(jobId, 'archive.sync')
					}
				}
			},
			{
				name: 'luzzle.sync',
				execute: async () => {
					const { changedPaths } = await new LuzzleSync().run()
					await progress.complete(jobId, 'luzzle.sync', `${changedPaths.length} pieces changed`)
					return changedPaths
				}
			},
			{
				name: 'web.sync',
				execute: async (changedPaths: string[]) => {
					await new WebSync().run({ filePaths: changedPaths })
					await progress.complete(jobId, 'web.sync')
				}
			},
			{
				name: 'assets.generate',
				execute: async (changedPaths: string[]) => {
					await new AssetsGenerate().run({ filePaths: changedPaths })
					await progress.complete(jobId, 'assets.generate')
				}
			},
			{
				name: 'cdn.sync',
				execute: async () => {
					const result = await new CdnSync().run()
					if (result === 'skipped') {
						await progress.skip(jobId, 'cdn.sync', 'skipped')
					} else {
						await progress.complete(jobId, 'cdn.sync')
					}
				}
			},
			{
				name: 'cache.purge',
				execute: async () => {
					await new CachePurge().run()
					await progress.complete(jobId, 'cache.purge')
				}
			}
		]

		let changedPaths: string[] = []

		for (const phase of phases) {
			await progress.start(jobId, phase.name)
			setActivePhase({ jobId, phase: phase.name })
			try {
				if (phase.name === 'web.sync' || phase.name === 'assets.generate') {
					await (phase.execute as (paths: string[]) => Promise<void>)(changedPaths)
				} else if (phase.name === 'luzzle.sync') {
					changedPaths = await (phase.execute as () => Promise<string[]>)()
				} else {
					await (phase.execute as () => Promise<void>)()
				}
			} catch (err) {
				await progress.fail(jobId, phase.name, err)
				throw err
			} finally {
				clearActivePhase()
			}
		}

		logger.info('publish complete')
		return 'ok'
	}
}
