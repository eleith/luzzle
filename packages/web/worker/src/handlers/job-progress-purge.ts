import { Job } from '@sidequest/core'
import { getWorkerContext } from './context.js'
import { JobProgress } from '../lib/job-progress.js'

export interface JobProgressPurgePayload {
	retentionDays?: number
}

export class JobProgressPurge extends Job {
	async run(payload: JobProgressPurgePayload = {}): Promise<string> {
		const { db, logger } = getWorkerContext()
		const retentionDays = payload.retentionDays ?? 2
		try {
			await new JobProgress(db, retentionDays).purgeOld()
			logger.info('job_progress purge complete', { retentionDays })
		} catch (err) {
			logger.error('job_progress purge failed', {
				error: err instanceof Error ? err.message : String(err),
			})
			throw err
		}
		return 'ok'
	}
}
