import path from 'node:path'
import type { Config } from '@luzzle/web.config'

export function resolveDbPath(config: Config): string {
	if (!config.paths.config) {
		throw new Error('config.paths.config is missing; cannot resolve database path')
	}
	return path.resolve(path.dirname(config.paths.config), config.paths.database)
}

export function resolveQueueDbPath(config: Config): string {
	if (!config.paths.config) {
		throw new Error('config.paths.config is missing; cannot resolve queue db path')
	}
	const queuePath = config.worker?.queue?.path ?? './data/sidequest.sqlite'
	return path.resolve(path.dirname(config.paths.config), queuePath)
}

export function resolveOpenWorkflowDbPath(config: Config): string {
	if (!config.paths.config) {
		throw new Error('config.paths.config is missing; cannot resolve openworkflow db path')
	}
	const queuePath = config.worker?.queue?.path ?? './data/sidequest.sqlite'
	const owPath = queuePath.replace('sidequest.sqlite', 'openworkflow.sqlite')
	return path.resolve(path.dirname(config.paths.config), owPath)
}

