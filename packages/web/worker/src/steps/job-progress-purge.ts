import { completed, type Step, type StepResult } from '../core/step.js'
import { JobProgress } from '../core/job-progress.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface JobProgressPurgeInput {
	retentionDays?: number
}

export const jobProgressPurgeStep: Step<JobProgressPurgeInput, void> = {
	name: 'job_progress.purge',
	async run(input, ctx): Promise<StepResult<void>> {
		const { db, logger, config } = ctx
		const retentionDays = input.retentionDays ?? 7
		const purgedJobIds = await new JobProgress(db, retentionDays).purgeExpired()

		for (const jobId of purgedJobIds) {
			const previewDir = path.join(path.dirname(config.paths.assets), 'previews', jobId.toString())
			try {
				await fs.rm(previewDir, { recursive: true, force: true })
				logger.info('purged preview assets directory', { jobId, previewDir })
			} catch (err) {
				logger.warn('failed to purge preview assets directory', { jobId, error: String(err) })
			}
		}

		logger.info('job_progress purge complete', { retentionDays, purgedCount: purgedJobIds.length })
		return completed(undefined)
	},
}
