import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

const DEFAULT_PORT = 9000

export function createHealthServer() {
	return createServer((req: IncomingMessage, res: ServerResponse) => {
		if (req.url === '/health') {
			res.statusCode = 200
			res.setHeader('content-type', 'application/json')
			res.end(JSON.stringify({ status: 'ok' }))
			return
		}
		res.statusCode = 404
		res.end()
	})
}

function main() {
	const port = Number(process.env.PORT) || DEFAULT_PORT
	const server = createHealthServer()
	server.listen(port, () => {
		console.log(`[worker] health server listening on :${port}`)
	})
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main()
}
