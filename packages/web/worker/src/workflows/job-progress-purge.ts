import { getOpenWorkflow, getOpenWorkflowBackend } from '@luzzle/web.jobs'
import { jobProgressPurgeSpec } from '@luzzle/web.jobs/specs'
import { randomInt } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getWorkerContext } from '../services/context.js'
import { JobProgress } from '../core/job-progress.js'

export function registerJobProgressPurgeWorkflow(): void {
	const openWorkflow = getOpenWorkflow()

	openWorkflow.implementWorkflow(jobProgressPurgeSpec, async ({ input, step }) => {
		const retentionDays = input.retentionDays ?? 7
		if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
			throw new Error('Cleanup retentionDays must be positive and finite')
		}
		const delaySeconds = await step.run({ name: 'choose-cleanup-jitter' }, () => randomInt(0, 1441))
		if (delaySeconds > 0) await step.sleep('cleanup-jitter', `${delaySeconds}s`)

		const { db, logger, config } = getWorkerContext()
		const progress = new JobProgress(db)
		const plan = await step.run({ name: 'plan-cleanup' }, async () => {
			const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000
			const previewsRoot = path.resolve(path.dirname(config.paths.assets), 'previews')
			let previewNames: string[]
			try {
				previewNames = (await fs.readdir(previewsRoot, { withFileTypes: true }))
					.filter((entry) => entry.isDirectory())
					.map((entry) => entry.name)
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
				previewNames = []
			}
			const directories = new Set(previewNames)
			const candidates = new Set([...(await progress.listJobIds()), ...previewNames])
			const jobIds: string[] = []
			const previewDirs: string[] = []
			const backend = getOpenWorkflowBackend()
			for (const jobId of candidates) {
				if (!/^[a-zA-Z0-9_-]+$/.test(jobId)) continue
				const previewDir = path.resolve(previewsRoot, jobId)
				if (path.dirname(previewDir) !== previewsRoot) continue
				const run = await backend.getWorkflowRun({ workflowRunId: jobId })
				if (!run) continue
				if (!['completed', 'failed', 'canceled', 'succeeded'].includes(run.status)) continue
				if (!run.finishedAt) continue
				const isExpired = run.finishedAt.getTime() < cutoffMs
				if (!isExpired) continue
				jobIds.push(jobId)
				if (directories.has(jobId)) previewDirs.push(previewDir)
			}
			return { cutoffMs, jobIds, previewDirs }
		})

		await step.run({ name: 'purge-preview-directories' }, async () => {
			for (const previewDir of plan.previewDirs) {
				await fs.rm(previewDir, { recursive: true, force: true })
			}
		})
		await step.run({ name: 'purge-app-rows' }, async () => {
			await progress.purgeJobs(plan.jobIds)
		})

		logger.info('openworkflow purge complete', { purgedCount: plan.jobIds.length })
		return 'ok'
	})
}
