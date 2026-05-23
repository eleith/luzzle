import path from 'node:path'
import { configureProducerQueue } from '@luzzle/web.jobs'
import { config } from '$lib/server/config.js'

export function resolveQueueDbPath(): string {
	const queuePath = config.worker?.queue?.path || './data/sidequest.sqlite'
	return path.resolve(process.cwd(), queuePath)
}

export async function configureQueue(): Promise<void> {
	await configureProducerQueue({ dbPath: resolveQueueDbPath() })
}
