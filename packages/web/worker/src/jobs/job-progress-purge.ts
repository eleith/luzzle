import { Job } from '@sidequest/core'
import { getWorkerContext } from '../services/context.js'
import { jobProgressPurgeStep } from '../steps/job-progress-purge.js'
import type {
	JobProgressPurgePayload,
	JobProgressPurgeResult,
} from '@luzzle/web.jobs'

export type { JobProgressPurgePayload, JobProgressPurgeResult }

export class JobProgressPurge extends Job {
	async run(payload: JobProgressPurgePayload = {}): Promise<JobProgressPurgeResult> {
		const ctx = getWorkerContext()
		try {
			await jobProgressPurgeStep.run(payload, ctx)
		} catch (err) {
			ctx.logger.error('job_progress purge failed', {
				error: err instanceof Error ? err.message : String(err),
			})
			throw err
		}
		return 'ok'
	}
}
