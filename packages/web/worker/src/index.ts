import { asCoreDatabase, migrate } from '@luzzle/core'
import { loadConfig, type TemplateConfig } from '@luzzle/web.templates/config'
import { createAppDb, resolveDbPath, resolveOpenWorkflowDbPath } from './services/db.js'
import { runWebMigrations } from '@luzzle/web.db'
import { createHealthServer } from './services/health.js'
import { createLogger, createOpenWorkflowLogger, log } from './services/logger.js'
import { createWorkerContext, setWorkerContext } from './services/context.js'
import { closeOpenWorkflow, initOpenWorkflow } from '@luzzle/web.jobs'
import { jobProgressPurgeSpec } from '@luzzle/web.jobs/specs'
import { registerWorkflows } from './workflows/index.js'
import { once } from 'node:events'
import type { Server } from 'node:http'
import type { Worker } from 'openworkflow'

const DEFAULT_PORT = 9000
const PURGE_RETENTION_DAYS = 7

async function closeHealthServer(server: Server): Promise<void> {
	if (!server.listening) return
	await new Promise<void>((resolve, reject) => {
		server.close((error) => {
			if (error) reject(error)
			else resolve()
		})
		server.closeAllConnections()
	})
}

export async function main(
	config: TemplateConfig = loadConfig('./config.yaml'),
	port: number = Number(process.env.PORT) || DEFAULT_PORT
) {
	const logger = createLogger()
	const db = createAppDb(resolveDbPath(config))
	const server = createHealthServer()
	let worker: Worker | undefined
	let purgeInterval: ReturnType<typeof setInterval> | undefined
	let stopPromise: Promise<void> | undefined

	async function stopResources(): Promise<void> {
		clearInterval(purgeInterval)
		await closeHealthServer(server)
		await worker?.stop()
		const errors: unknown[] = []
		try {
			await closeOpenWorkflow()
		} catch (error) {
			errors.push(error)
		}
		try {
			await db.destroy()
		} catch (error) {
			errors.push(error)
		}
		if (errors.length) throw new AggregateError(errors, 'Worker database cleanup failed')
		logger.info('openworkflow worker stopped')
	}

	function stop(): Promise<void> {
		stopPromise ??= stopResources()
		return stopPromise
	}

	try {
		const coreResult = await migrate(asCoreDatabase(db))
		if (coreResult.error)
			throw new Error('Luzzle core migration failed', { cause: coreResult.error })
		logger.info('luzzle core migrations applied')
		const webResult = await runWebMigrations(db)
		if (webResult.error) throw new Error('Web migration failed', { cause: webResult.error })
		logger.info('web migrations applied')

		setWorkerContext(createWorkerContext(config, db, logger))
		const openWorkflowDb = resolveOpenWorkflowDbPath(config)
		const openWorkflow = initOpenWorkflow({
			dbPath: openWorkflowDb,
			logger: createOpenWorkflowLogger(logger),
		})
		logger.info('openworkflow client configured', { openWorkflowDb })
		registerWorkflows()
		worker = openWorkflow.newWorker()
		await worker.start()
		logger.info('openworkflow worker started')

		async function enqueuePurge(): Promise<void> {
			try {
				const run = await openWorkflow.runWorkflow(jobProgressPurgeSpec, {
					retentionDays: PURGE_RETENTION_DAYS,
				})
				logger.info('openworkflow job progress purge enqueued', { jobId: run.workflowRun.id })
			} catch {
				logger.error('failed to enqueue openworkflow job progress purge')
			}
		}

		void enqueuePurge()
		purgeInterval = setInterval(enqueuePurge, 24 * 60 * 60 * 1000)
		const listening = once(server, 'listening')
		server.listen(port)
		await listening
		logger.info('health server listening', { port })
		return { server, stop }
	} catch (error) {
		try {
			await stop()
		} catch (cleanupError) {
			throw new AggregateError([error, cleanupError], 'Worker startup and cleanup failed')
		}
		throw error
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main()
		.then(({ stop }) => {
			const shutdown = () => {
				void stop().catch(() => {
					log('error', 'worker shutdown failed; resources may still be active')
					process.exitCode = 1
				})
			}
			process.once('SIGTERM', shutdown)
			process.once('SIGINT', shutdown)
		})
		.catch((error) => {
			log('error', 'worker failed to start', {
				error: error instanceof Error ? error.message : String(error),
			})
			process.exitCode = 1
		})
}
