import { getOpenWorkflow } from '@luzzle/web.jobs/openworkflow'
import { jobProgressPurgeSpec } from '@luzzle/web.jobs/specs'
import { getWorkerContext } from '../services/context.js'
import { JobProgress } from '../core/job-progress.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export function registerJobProgressPurgeWorkflow(): void {
	const ow = getOpenWorkflow()

	ow.implementWorkflow(jobProgressPurgeSpec, async ({ input, step }) => {
		const ctx = getWorkerContext()
		const { db, logger, config } = ctx
		const retentionDays = input.retentionDays ?? 2

		// 1. Purge old entries from database
		const purgedJobIds = await step.run({ name: 'purge-db-entries' }, async () => {
			return await new JobProgress(db, retentionDays).purgeOld()
		})

		// 2. Clean up preview directories on disk
		await step.run({ name: 'purge-disk-directories' }, async () => {
			for (const jobId of purgedJobIds) {
				const previewDir = path.join(
					path.dirname(config.paths.assets),
					'previews',
					jobId.toString()
				)
				try {
					await fs.rm(previewDir, { recursive: true, force: true })
					logger.info('purged preview assets directory', { jobId, previewDir })
				} catch (err) {
					logger.warn('failed to purge preview assets directory', {
						jobId,
						error: String(err),
					})
				}
			}
		})

		logger.info('openworkflow purge complete', {
			retentionDays,
			purgedCount: purgedJobIds.length,
		})

		return 'ok'
	})
}
