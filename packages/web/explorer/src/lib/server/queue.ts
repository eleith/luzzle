import { Sidequest } from 'sidequest'
import { config } from '$lib/server/config.js'
import path from 'node:path'
import { type JobClassType } from '@sidequest/core'

let configured = false

export function resolveQueueDbPath(): string {
	const queuePath = config.worker?.queue?.path || './data/sidequest.sqlite'
	return path.resolve(process.cwd(), queuePath)
}

export async function configureQueue(): Promise<void> {
	if (configured) return

	await Sidequest.configure({
		backend: {
			driver: '@sidequest/sqlite-backend',
			config: resolveQueueDbPath()
		}
	})

	configured = true
}

export async function enqueueJob(JobClass: JobClassType, payload?: unknown) {
	await configureQueue()

	const job = await Sidequest.build(JobClass).maxAttempts(1).enqueue(payload)

	return job
}
