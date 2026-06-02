import { getDatabaseClient, migrate } from '@luzzle/core'
import { loadConfig } from '@luzzle/web.config'
import { resolveDbPath, resolveOpenWorkflowDbPath } from './services/db.js'
import { runWebMigrations } from '@luzzle/web.db'
import { createHealthServer } from './services/health.js'
import { log } from './services/logger.js'
import { initOpenWorkflow } from '@luzzle/web.jobs/openworkflow'
import { jobProgressPurgeSpec } from '@luzzle/web.jobs/specs'

const DEFAULT_PORT = 9000
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

	const owDb = resolveOpenWorkflowDbPath(config)
	const ow = initOpenWorkflow({ dbPath: owDb })
	log('info', 'openworkflow client configured', { owDb })

	const { registerWorkflows } = await import('./workflows/index.js')
	registerWorkflows()

	const owWorker = ow.newWorker()
	await owWorker.start()
	log('info', 'openworkflow worker started')

	const runPurge = async () => {
		try {
			log('info', 'triggering openworkflow job progress purge...')
			await ow.runWorkflow(jobProgressPurgeSpec, { retentionDays: PURGE_RETENTION_DAYS })
			log('info', 'openworkflow job progress purge run completed successfully')
		} catch (err) {
			log('error', 'openworkflow job progress purge run failed', {
				error: err instanceof Error ? err.message : String(err),
			})
		}
	}

	// Trigger immediately on start (non-blocking)
	runPurge()

	// Schedule to run every 24 hours
	const purgeInterval = setInterval(runPurge, 24 * 60 * 60 * 1000)

	const shutdown = async () => {
		log('info', 'shutting down openworkflow worker...')
		clearInterval(purgeInterval)
		await owWorker.stop()
		log('info', 'openworkflow worker stopped')
		process.exit(0)
	}
	process.on('SIGTERM', shutdown)
	process.on('SIGINT', shutdown)

	const port = Number(process.env.PORT) || DEFAULT_PORT
	const server = createHealthServer()
	server.listen(port, () => {
		log('info', 'health server listening', { port })
	})
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((err) => {
		log('error', 'worker failed to start', {
			error: err instanceof Error ? err.message : String(err),
		})
		process.exit(1)
	})
}
