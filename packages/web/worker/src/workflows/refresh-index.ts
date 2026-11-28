import { getOpenWorkflow } from '@luzzle/web.jobs'
import { refreshIndexSpec } from '@luzzle/web.jobs/specs'
import { JobProgress } from '../core/job-progress.js'
import { runProgressPhase } from '../core/run-progress-phase.js'
import { getWorkerContext } from '../services/context.js'
import { luzzleSyncStep } from '../steps/luzzle-sync.js'

export function registerRefreshIndexWorkflow(): void {
	getOpenWorkflow().implementWorkflow(refreshIndexSpec, async ({ step, run }) => {
		const ctx = getWorkerContext()
		const progress = new JobProgress(ctx.db)
		const result = await runProgressPhase(step, ctx, run.id, progress, luzzleSyncStep, undefined)
		if (!result) throw new Error('Archive index refresh did not complete')
		return result.hadErrors ? 'partial' : 'ok'
	})
}
