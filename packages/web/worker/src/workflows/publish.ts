import { publishSpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow } from '@luzzle/web.jobs'
import { getWorkerContext } from '../services/context.js'
import { JobProgress } from '../core/job-progress.js'
import { PhaseLogger } from '../core/phase-logger.js'

import { archiveSyncStep } from '../steps/archive-sync.js'
import { luzzleSyncStep } from '../steps/luzzle-sync.js'
import { webSyncStep } from '../steps/web-sync/index.js'
import { assetsGenerateStep } from '../steps/assets-generate.js'
import { cdnSyncStep } from '../steps/cdn-sync.js'
import { cachePurgeStep } from '../steps/cache-purge.js'

export function registerPublishWorkflow(): void {
	const ow = getOpenWorkflow()

	ow.implementWorkflow(publishSpec, async ({ input, step }) => {
		const ctx = getWorkerContext()
		const { logger, db } = ctx

		const jobId = input.jobId ?? Math.floor(Math.random() * 2147483647)
		const progress = new JobProgress(db)

		logger.info('openworkflow publish starting', { jobId })

		// 1. archive-sync step
		await step.run({ name: archiveSyncStep.name }, async () => {
			if (logger instanceof PhaseLogger) {
				logger.setActivePhase({ jobId, phase: archiveSyncStep.name })
			}
			await progress.start(jobId, archiveSyncStep.name)
			try {
				const res = await archiveSyncStep.run(undefined, ctx)
				if (res.status === 'skipped') {
					await progress.skip(jobId, archiveSyncStep.name, res.message || 'skipped')
				} else {
					await progress.complete(jobId, archiveSyncStep.name)
				}
			} catch (err) {
				await progress.fail(jobId, archiveSyncStep.name, err)
				throw err
			} finally {
				if (logger instanceof PhaseLogger) {
					logger.clearActivePhase()
				}
			}
		})

		// 2. luzzle-sync step
		const luzzleResult = await step.run({ name: luzzleSyncStep.name }, async () => {
			if (logger instanceof PhaseLogger) {
				logger.setActivePhase({ jobId, phase: luzzleSyncStep.name })
			}
			await progress.start(jobId, luzzleSyncStep.name)
			try {
				const res = await luzzleSyncStep.run(undefined, ctx)
				if (res.status === 'skipped') {
					await progress.skip(jobId, luzzleSyncStep.name, res.message || 'skipped')
					return { changedPaths: [] }
				}
				await progress.complete(jobId, luzzleSyncStep.name)
				return res.value
			} catch (err) {
				await progress.fail(jobId, luzzleSyncStep.name, err)
				throw err
			} finally {
				if (logger instanceof PhaseLogger) {
					logger.clearActivePhase()
				}
			}
		})

		const changedPaths = luzzleResult?.changedPaths ?? []

		// 3. web-sync step
		await step.run({ name: webSyncStep.name }, async () => {
			if (logger instanceof PhaseLogger) {
				logger.setActivePhase({ jobId, phase: webSyncStep.name })
			}
			await progress.start(jobId, webSyncStep.name)
			try {
				const res = await webSyncStep.run({ filePaths: changedPaths }, ctx)
				if (res.status === 'skipped') {
					await progress.skip(jobId, webSyncStep.name, res.message || 'skipped')
				} else {
					await progress.complete(jobId, webSyncStep.name)
				}
			} catch (err) {
				await progress.fail(jobId, webSyncStep.name, err)
				throw err
			} finally {
				if (logger instanceof PhaseLogger) {
					logger.clearActivePhase()
				}
			}
		})

		// 4. assets-generate step
		await step.run({ name: assetsGenerateStep.name }, async () => {
			if (logger instanceof PhaseLogger) {
				logger.setActivePhase({ jobId, phase: assetsGenerateStep.name })
			}
			await progress.start(jobId, assetsGenerateStep.name)
			try {
				const res = await assetsGenerateStep.run({ filePaths: changedPaths }, ctx)
				if (res.status === 'skipped') {
					await progress.skip(jobId, assetsGenerateStep.name, res.message || 'skipped')
				} else {
					await progress.complete(jobId, assetsGenerateStep.name)
				}
			} catch (err) {
				await progress.fail(jobId, assetsGenerateStep.name, err)
				throw err
			} finally {
				if (logger instanceof PhaseLogger) {
					logger.clearActivePhase()
				}
			}
		})

		// 5. cdn-sync step
		await step.run({ name: cdnSyncStep.name }, async () => {
			if (logger instanceof PhaseLogger) {
				logger.setActivePhase({ jobId, phase: cdnSyncStep.name })
			}
			await progress.start(jobId, cdnSyncStep.name)
			try {
				const res = await cdnSyncStep.run(undefined, ctx)
				if (res.status === 'skipped') {
					await progress.skip(jobId, cdnSyncStep.name, res.message || 'skipped')
				} else {
					await progress.complete(jobId, cdnSyncStep.name)
				}
			} catch (err) {
				await progress.fail(jobId, cdnSyncStep.name, err)
				throw err
			} finally {
				if (logger instanceof PhaseLogger) {
					logger.clearActivePhase()
				}
			}
		})

		// 6. cache-purge step
		await step.run({ name: cachePurgeStep.name }, async () => {
			if (logger instanceof PhaseLogger) {
				logger.setActivePhase({ jobId, phase: cachePurgeStep.name })
			}
			await progress.start(jobId, cachePurgeStep.name)
			try {
				const res = await cachePurgeStep.run(undefined, ctx)
				if (res.status === 'skipped') {
					await progress.skip(jobId, cachePurgeStep.name, res.message || 'skipped')
				} else {
					await progress.complete(jobId, cachePurgeStep.name)
				}
			} catch (err) {
				await progress.fail(jobId, cachePurgeStep.name, err)
				throw err
			} finally {
				if (logger instanceof PhaseLogger) {
					logger.clearActivePhase()
				}
			}
		})

		logger.info('openworkflow publish complete', { jobId })
		return 'ok'
	})
}
