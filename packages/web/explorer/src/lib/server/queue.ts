import { Sidequest } from 'sidequest'
import { config } from '$lib/server/config.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { type JobClassType } from '@sidequest/core'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

export function resolveJobsFilePath(): string {
	const tsPath = path.join(SCRIPT_DIR, 'sidequest.jobs.ts')
	if (existsSync(tsPath)) return tsPath
	return path.join(SCRIPT_DIR, 'sidequest.jobs.js')
}

export function resolveQueueDbPath(): string {
	const queuePath = config.worker?.queue?.path || './data/sidequest.sqlite'
	return path.resolve(process.cwd(), queuePath)
}

export async function configureQueue(): Promise<void> {
	try {
		console.log('[queue] starting Sidequest configuration...')
		await Sidequest.configure({
			backend: {
				driver: '@sidequest/sqlite-backend',
				config: resolveQueueDbPath()
			},
			manualJobResolution: true,
			jobsFilePath: resolveJobsFilePath()
		})
		console.log('[queue] Sidequest configuration finished.')
	} catch (error) {
		console.error('[queue] Sidequest configuration failed:', error)
		throw error
	}
}

export async function enqueueJob(JobClass: JobClassType, payload?: unknown) {
	console.log('[queue] enqueueJob for:', JobClass.name)
	await configureQueue()

	console.log('[queue] building job...')
	try {
		const job = await Sidequest.build(JobClass).maxAttempts(1).enqueue(payload)
		console.log('[queue] job enqueued with id:', job.id)
		return job
	} catch (error) {
		console.error('[queue] failed to build/enqueue job:', error)
		throw error
	}
}
