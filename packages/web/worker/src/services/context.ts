import { loadConfig, type TemplateConfig } from '@luzzle/web.templates/config'
import { createLogger } from './logger.js'
import type { Logger } from './logger.js'
import { RcloneClient } from './rclone.js'
import type { Kysely } from 'kysely'
import type { AppDatabase } from './db.js'
import { createAppDb, resolveDbPath } from './db.js'
import { PhaseLogger } from '../core/phase-logger.js'

export interface WorkerContext {
	config: TemplateConfig
	logger: Logger
	rclone: RcloneClient
	db: Kysely<AppDatabase>
}

export function createPhaseContext(
	ctx: WorkerContext,
	jobId: string,
	phase: string
): WorkerContext {
	if (!(ctx.logger instanceof PhaseLogger)) return ctx
	const logger = ctx.logger.forPhase({ jobId, phase })
	return { ...ctx, logger, rclone: ctx.rclone.withLogger(logger) }
}

export function createWorkerContext(
	config: TemplateConfig,
	db: Kysely<AppDatabase>,
	baseLogger: Logger = createLogger()
): WorkerContext {
	const logger = new PhaseLogger(baseLogger, db)
	return { config, db, logger, rclone: new RcloneClient(logger) }
}

let workerContext: WorkerContext | null = null

export function setWorkerContext(ctx: WorkerContext): void {
	workerContext = ctx
}

export function getWorkerContext(): WorkerContext {
	if (workerContext) return workerContext
	const config = loadConfig('./config.yaml')
	workerContext = createWorkerContext(config, createAppDb(resolveDbPath(config)))
	return workerContext
}
