import { Job } from '@sidequest/core'
import { getWorkerContext } from '../services/context.js'
import { JobProgress } from '../core/job-progress.js'
import { StepRunner } from '../core/step-runner.js'
import { archiveSyncStep } from '../steps/archive-sync.js'
import { luzzleSyncStep } from '../steps/luzzle-sync.js'
import { webSyncStep } from '../steps/web-sync/index.js'
import { assetsGenerateStep } from '../steps/assets-generate.js'
import { cdnSyncStep } from '../steps/cdn-sync.js'
import { cachePurgeStep } from '../steps/cache-purge.js'
import type { PublishPayload, PublishResult } from '../api/publish.js'

export type { PublishPayload, PublishResult }

export class Publish extends Job {
	async run(): Promise<PublishResult> {
		const ctx = getWorkerContext()
		const { logger, db } = ctx
		logger.info('publish starting')

		const progress = new JobProgress(db, 2)
		const runner = new StepRunner(ctx, progress, this.id)

		await runner.run(archiveSyncStep, undefined)
		const luzzleResult = await runner.run(luzzleSyncStep, undefined)
		const changedPaths = luzzleResult?.changedPaths ?? []
		await runner.run(webSyncStep, { filePaths: changedPaths })
		await runner.run(assetsGenerateStep, { filePaths: changedPaths })
		await runner.run(cdnSyncStep, undefined)
		await runner.run(cachePurgeStep, undefined)

		logger.info('publish complete')
		return 'ok'
	}
}
