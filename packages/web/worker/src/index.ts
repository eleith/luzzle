import { loadConfig } from '@luzzle/web.config'
import { createWorkerDb } from './db.js'
import { configureQueue } from './queue.js'
import { createHealthServer } from './health.js'
import { log } from './logger.js'

const DEFAULT_PORT = 9000
const DEFAULT_QUEUE_DB = '/app/queue/sidequest.db'

async function main() {
	const config = loadConfig(process.env.LUZZLE_CONFIG_PATH)
	createWorkerDb(config)

	const queueDb = process.env.SIDEQUEST_DB ?? DEFAULT_QUEUE_DB
	await configureQueue(queueDb)
	log('info', 'queue configured', { queueDb })

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
