import { completed, type Step, type StepResult } from '../core/step.js'
import { JobProgress } from '../core/job-progress.js'

export interface JobProgressPurgeInput {
	retentionDays?: number
}

export const jobProgressPurgeStep: Step<JobProgressPurgeInput, void> = {
	name: 'job_progress.purge',
	async run(input, ctx): Promise<StepResult<void>> {
		const { db, logger } = ctx
		const retentionDays = input.retentionDays ?? 2
		await new JobProgress(db, retentionDays).purgeOld()
		logger.info('job_progress purge complete', { retentionDays })
		return completed(undefined)
	},
}
