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
import { publishPrepareStep } from '../steps/publish-prepare.js'
import { publishCompleteStep } from '../steps/publish-complete.js'
import { emptyPiecesDiff } from './pieces-diff.js'

export function registerPublishWorkflow(): void {
	const openWorkflow = getOpenWorkflow()

	openWorkflow.implementWorkflow(publishSpec, async ({ input, step, run }) => {
		const ctx = getWorkerContext()
		const { logger, db } = ctx

		const jobId = run.id
		const progress = new JobProgress(db)

		logger.info('openworkflow publish starting', { jobId, bisync: input.bisync ?? false })

		if (input.bisync) {
			await runProgressPhase(step, ctx, jobId, progress, archiveSyncStep, undefined)
		}

		const summary = await runProgressPhase(step, ctx, jobId, progress, luzzleSyncStep, undefined)
		const plan = await runProgressPhase(
			step,
			ctx,
			jobId,
			progress,
			publishPrepareStep,
			summary ?? emptyPiecesDiff()
		)
		if (!plan) throw new Error('publish.prepare did not return a plan')
		const changedPaths = plan.pieces.map((piece) => piece.filePath)

		await runProgressPhase(step, ctx, jobId, progress, webSyncStep, { filePaths: changedPaths })
		const assetsReport = await runProgressPhase(step, ctx, jobId, progress, assetsGenerateStep, {
			filePaths: changedPaths,
		})
		await runProgressPhase(step, ctx, jobId, progress, cdnSyncStep, undefined)
		await runProgressPhase(step, ctx, jobId, progress, cachePurgeStep, undefined)

		const failedPieces = assetsReport?.failedPieces ?? []
		await runProgressPhase(step, ctx, jobId, progress, publishCompleteStep, {
			pieces: plan.pieces,
			failedPieces,
		})

		if (failedPieces.length > 0) {
			logger.warn('openworkflow publish complete with failures', {
				jobId,
				failedCount: failedPieces.length,
			})
		} else {
			logger.info('openworkflow publish complete', { jobId })
		}
		return { ...plan.summary, failedPieces }
	})
}
