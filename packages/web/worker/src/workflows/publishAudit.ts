import { publishAuditSpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow } from '@luzzle/web.jobs'
import { getWorkerContext } from '../services/context.js'
import { JobProgress } from '../core/job-progress.js'
import { runProgressPhase } from '../core/run-progress-phase.js'
import { archiveSyncStep } from '../steps/archive-sync.js'
import { luzzleAuditStep } from '../steps/luzzle-audit.js'
import { emptyPiecesDiff } from './pieces-diff.js'

export function registerPublishAuditWorkflow(): void {
	const openWorkflow = getOpenWorkflow()

	openWorkflow.implementWorkflow(publishAuditSpec, async ({ input, step, run }) => {
		const ctx = getWorkerContext()
		const { logger, db } = ctx

		const jobId = run.id
		const progress = new JobProgress(db)

		logger.info('openworkflow publish audit starting', { jobId, bisync: input.bisync ?? false })

		if (input.bisync) {
			await runProgressPhase(step, ctx, jobId, progress, archiveSyncStep, undefined)
		}

		const diff = await runProgressPhase(step, ctx, jobId, progress, luzzleAuditStep, undefined)

		logger.info('openworkflow publish audit complete', { jobId })
		return diff ?? emptyPiecesDiff()
	})
}
