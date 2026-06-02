import path from 'node:path'
import { config } from '$lib/server/config.js'

export function resolveOpenWorkflowDbPath(): string {
	const queuePath = config.worker?.queue?.path || './data/sidequest.sqlite'
	const owPath = queuePath.replace('sidequest.sqlite', 'openworkflow.sqlite')
	return path.resolve(process.cwd(), owPath)
}
