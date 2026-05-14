import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

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
