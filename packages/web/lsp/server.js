import { createServer as httpServer } from 'http'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import { toSocket, launch } from 'vscode-ws-jsonrpc/server'

const PORT = 9001
const BUILD_SECRET_TOKEN = process.env.LUZZLE_BUILD_TOKEN
const LSP_ROOT = process.env.LUZZLE_LSP_ROOT || '/app/archive'

function createServer() {
	const wss = new WebSocketServer({ noServer: true })

	const server = httpServer((req, res) => {
		res.writeHead(404, { 'Content-Type': 'text/plain' })
		res.end('Not Found')
	})

	server.on('upgrade', (req, socket, head) => {
		const url = new URL(req.url || '', `http://localhost`)

		if (url.pathname !== '/lsp') {
			socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
			socket.destroy()
			return
		}

		if (BUILD_SECRET_TOKEN && url.searchParams.get('token') !== BUILD_SECRET_TOKEN) {
			socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
			socket.destroy()
			return
		}

		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit('connection', ws, req)
		})
	})

	wss.on('connection', (ws) => {
		console.log(`[${new Date().toISOString()}] LSP client connected`)

		const socket = toSocket(ws)
		launch(socket, {
			serverName: 'luzzle-lsp',
			command: 'luzzle-lsp',
			args: ['--stdio'],
			options: {
				env: { ...process.env, LUZZLE_LSP_ROOT: LSP_ROOT },
			},
		})

		ws.on('close', () => {
			console.log(`[${new Date().toISOString()}] LSP client disconnected`)
		})
	})

	return server
}

const server = createServer()

/* c8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	server.listen(PORT, '0.0.0.0', () => {
		console.log(`Luzzle Web LSP listening on port ${PORT}`)
		if (!BUILD_SECRET_TOKEN) {
			console.error('WARNING: LUZZLE_BUILD_TOKEN env var is not set! Auth will fail.')
		}
	})
}
/* c8 ignore stop */

export { server, createServer }
