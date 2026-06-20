import { publishSpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow } from '@luzzle/web.jobs'
import { getWorkerContext } from '../services/context.js'
import { JobProgress } from '../core/job-progress.js'
import { runProgressPhase } from '../core/run-progress-phase.js'

import { archiveSyncStep } from '../steps/archive-sync.js'
import { luzzleSyncStep } from '../steps/luzzle-sync.js'
import { webSyncStep } from '../steps/web-sync/index.js'
import { assetsGenerateStep } from '../steps/assets-generate.js'
import { cdnSyncStep } from '../steps/cdn-sync.js'
import { cachePurgeStep } from '../steps/cache-purge.js'

export function registerPublishWorkflow(): void {
	const openWorkflow = getOpenWorkflow()

	openWorkflow.implementWorkflow(publishSpec, async ({ step, run }) => {
		const ctx = getWorkerContext()
		const { logger, db } = ctx

		const jobId = run.id
		const progress = new JobProgress(db)

		logger.info('openworkflow publish starting', { jobId })

		await runProgressPhase(step, ctx, jobId, progress, archiveSyncStep, undefined)

		const luzzleResult = await runProgressPhase(step, ctx, jobId, progress, luzzleSyncStep, undefined)
		const changedPaths = luzzleResult?.changedPaths ?? []

		await runProgressPhase(step, ctx, jobId, progress, webSyncStep, { filePaths: changedPaths })
		await runProgressPhase(step, ctx, jobId, progress, assetsGenerateStep, { filePaths: changedPaths })
		await runProgressPhase(step, ctx, jobId, progress, cdnSyncStep, undefined)
		await runProgressPhase(step, ctx, jobId, progress, cachePurgeStep, undefined)

		logger.info('openworkflow publish complete', { jobId })
		return 'ok'
	})
}
