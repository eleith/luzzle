import { loadConfig, type Config } from '@luzzle/web.config'
import type { Logger } from '../logger.js'
import { createLogger } from '../logger.js'
import { RcloneClient } from '../lib/rclone.js'
import type { Kysely } from 'kysely'
import type { AppDatabase } from '../db.js'
import { createAppDb } from '../db.js'
import { PhaseLogger } from '../lib/phase-logger.js'

export interface WorkerContext {
	config: Config
	logger: Logger
	rclone: RcloneClient
	db: Kysely<AppDatabase>
}

let workerContext: WorkerContext | null = null

export function setWorkerContext(ctx: WorkerContext): void {
	workerContext = ctx
}

export function getWorkerContext(): WorkerContext {
	if (workerContext) return workerContext
	const config = loadConfig('./config.yaml')
	const baseLogger = createLogger()
	const logger = new PhaseLogger(baseLogger)
	workerContext = {
		config,
		logger,
		rclone: new RcloneClient(logger),
		db: createAppDb(config),
	}
	return workerContext
}
