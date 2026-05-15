import { loadConfig } from '@luzzle/web.config'
import { createWorkerDb, resolveQueueDbPath } from './db.js'
import { configureQueue } from './queue.js'
import { createHealthServer } from './health.js'
import { log } from './logger.js'

const DEFAULT_PORT = 9000

async function main() {
	const config = loadConfig('./config.yaml')
	createWorkerDb(config)

	const queueDb = resolveQueueDbPath(config)
	await configureQueue(queueDb)
	log('info', 'queue configured', { queueDb })

	const { Sidequest } = await import('sidequest')
	await Sidequest.start()
	log('info', 'sidequest engine started')

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
