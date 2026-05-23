import { getDatabaseClient, migrate } from '@luzzle/core'
import { loadConfig } from '@luzzle/web.config'
import { resolveDbPath, resolveQueueDbPath } from './services/db.js'
import { runWebMigrations } from '@luzzle/web.db'
import { configureQueue } from './services/queue.js'
import { createHealthServer } from './services/health.js'
import { log } from './services/logger.js'
import { JobProgressPurge } from './jobs/job-progress-purge.js'

const DEFAULT_PORT = 9000
const PURGE_CRON = '0 4 * * *'
const PURGE_RETENTION_DAYS = 2

async function main() {
	const config = loadConfig('./config.yaml')

	const db = getDatabaseClient(resolveDbPath(config))

	const coreResult = await migrate(db)
	if (coreResult.error) {
		throw new Error(`luzzle core migration failed: ${coreResult.error}`)
	}
	log('info', 'luzzle core migrations applied')

	const webResult = await runWebMigrations(db)
	if (webResult.error) {
		throw new Error(`web migration failed: ${webResult.error}`)
	}
	log('info', 'web migrations applied')

	const queueDb = resolveQueueDbPath(config)
	await configureQueue(queueDb)
	log('info', 'queue configured', { queueDb })

	const { Sidequest } = await import('sidequest')
	await Sidequest.start()
	log('info', 'sidequest engine started')

	await Sidequest.build(JobProgressPurge)
		.scheduleOptions({ timezone: 'UTC' })
		.schedule(PURGE_CRON, { retentionDays: PURGE_RETENTION_DAYS })
	log('info', 'job_progress purge scheduled', {
		cron: PURGE_CRON,
		retentionDays: PURGE_RETENTION_DAYS,
	})

	const port = Number(process.env.PORT) || DEFAULT_PORT
	const server = createHealthServer()
	server.listen(port, () => {
		log('info', 'health server listening', { port })
	})
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((err) => {
		log('error', 'worker failed to start', {
			error: err instanceof Error ? err.message : String(err)
		})
		process.exit(1)
	})
}
