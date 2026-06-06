import { getOpenWorkflow, purgeExpiredWorkflowRuns } from '@luzzle/web.jobs'
import { jobProgressPurgeSpec } from '@luzzle/web.jobs/specs'
import { getWorkerContext } from '../services/context.js'
import { JobProgress } from '../core/job-progress.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { resolveOpenWorkflowDbPath } from '../services/db.js'
import { DatabaseSync } from 'node:sqlite'

export function registerJobProgressPurgeWorkflow(): void {
	const openWorkflow = getOpenWorkflow()

	openWorkflow.implementWorkflow(jobProgressPurgeSpec, async ({ input, step }) => {
		const ctx = getWorkerContext()
		const { db, logger, config } = ctx
		const retentionDays = input.retentionDays ?? 7

		// 1. Purge old entries from database
		const purgedJobIds = await step.run({ name: 'purge-db-entries' }, async () => {
			return await new JobProgress(db, retentionDays).purgeExpired()
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

		// 3. Clean up OpenWorkflow database entries
		await step.run({ name: 'purge-openworkflow-entries' }, async () => {
			try {
				const openWorkflowDbPath = resolveOpenWorkflowDbPath(config)
				const openWorkflowDb = new DatabaseSync(openWorkflowDbPath)
				const count = purgeExpiredWorkflowRuns(openWorkflowDb, retentionDays)
				logger.info('purged openworkflow runs', { count })
			} catch (err) {
				logger.error('failed to purge openworkflow runs', { error: String(err) })
			}
		})

		logger.info('openworkflow purge complete', {
			retentionDays,
			purgedCount: purgedJobIds.length,
		})

		return 'ok'
	})
}
