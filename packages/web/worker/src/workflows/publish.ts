import { publishSpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow } from '@luzzle/web.jobs'
import { getWorkerContext } from '../services/context.js'
import { publishPiece, publishArchive, type PublicationReport } from '../services/publish.js'
import { JobProgress } from '../core/job-progress.js'
import { runProgressPhase } from '../core/run-progress-phase.js'
import { cachePurgeStep } from '../steps/cache-purge.js'
import { publishCompleteStep } from '../steps/publish-complete.js'

export function registerPublishWorkflow(): void {
	getOpenWorkflow().implementWorkflow(publishSpec, async ({ input, step, run }) => {
		const ctx = getWorkerContext()
		const jobId = run.id
		const progress = new JobProgress(ctx.db)
		const execution = { step, ctx, jobId, progress }
		ctx.logger.info('openworkflow publish starting', { jobId })
		let report: PublicationReport
		if ('filePath' in input) {
			report = await publishPiece(input, execution)
		} else {
			report = await publishArchive(input, execution)
		}
		await runProgressPhase(step, ctx, jobId, progress, cachePurgeStep, undefined)
		await runProgressPhase(step, ctx, jobId, progress, publishCompleteStep, {
			pieces: report.pieces,
			failedPieces: report.failedPieces,
		})
		if (report.failedPieces.length) {
			ctx.logger.warn('openworkflow publish complete with failures', {
				jobId,
				failedCount: report.failedPieces.length,
			})
		} else ctx.logger.info('openworkflow publish complete', { jobId })
		return { ...report.summary, failedPieces: report.failedPieces }
	})
}
