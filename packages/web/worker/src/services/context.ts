import { loadConfig, type Config } from '@luzzle/web.config'
import { createLogger } from './logger.js'
import type { Logger } from './logger.js'
import { RcloneClient } from './rclone.js'
import type { Kysely } from 'kysely'
import type { AppDatabase } from './db.js'
import { createAppDb, resolveDbPath } from './db.js'
import { PhaseLogger } from '../core/phase-logger.js'

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
	const baseLogger: Logger = createLogger()
	const db = createAppDb(resolveDbPath(config))
	const logger = new PhaseLogger(baseLogger, db)
	workerContext = {
		config,
		logger,
		rclone: new RcloneClient(logger),
		db,
	}
	return workerContext
}
