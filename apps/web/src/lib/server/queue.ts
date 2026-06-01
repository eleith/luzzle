import path from 'node:path'
import { configureQueue as configureSharedQueue, initOpenWorkflow } from '@luzzle/web.jobs'
import { config } from '$lib/server/config.js'

export function resolveQueueDbPath(): string {
	const queuePath = config.worker?.queue?.path || './data/sidequest.sqlite'
	return path.resolve(process.cwd(), queuePath)
}

export function resolveOpenWorkflowDbPath(): string {
	const queuePath = config.worker?.queue?.path || './data/sidequest.sqlite'
	const owPath = queuePath.replace('sidequest.sqlite', 'openworkflow.sqlite')
	return path.resolve(process.cwd(), owPath)
}

export async function configureQueue(): Promise<void> {
	await configureSharedQueue({ dbPath: resolveQueueDbPath() })
}

export function configureOpenWorkflow(): void {
	initOpenWorkflow({ dbPath: resolveOpenWorkflowDbPath() })
}
