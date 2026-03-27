import { createServer as httpServer } from 'http'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import { toSocket } from 'vscode-ws-jsonrpc'
import { createWebSocketConnection, createServerProcess } from 'vscode-ws-jsonrpc/server'

const PORT = 9001
const BUILD_SECRET_TOKEN = process.env.LUZZLE_BUILD_TOKEN
const LSP_ROOT = process.env.LUZZLE_LSP_ROOT || '/app/archive'
const ROOT_URI = `file://${LSP_ROOT}`

/**
 * Rewrite document URIs from client-relative (file:///piece.books.md)
 * to server-absolute (file:///app/archive/piece.books.md).
 */
function rewriteToServer(message) {
	if (!message.params) return message
	const params = message.params

	const textDocument = params.textDocument
	if (textDocument?.uri && !textDocument.uri.startsWith(ROOT_URI + '/')) {
		const filename = textDocument.uri.replace(/^file:\/\/\//, '')
		params.textDocument = { ...textDocument, uri: `${ROOT_URI}/${filename}` }
	}

	return message
}

/**
 * Rewrite document URIs from server-absolute back to client-relative.
 */
function rewriteToClient(message) {
	if (!message.params) return message
	const params = message.params
	const prefix = ROOT_URI + '/'

	if (typeof params.uri === 'string' && params.uri.startsWith(prefix)) {
		params.uri = `file:///${params.uri.slice(prefix.length)}`
	}

	// other notifications may have textDocument.uri
	const textDocument = params.textDocument
	if (textDocument?.uri && textDocument.uri.startsWith(prefix)) {
		params.textDocument = { ...textDocument, uri: `file:///${textDocument.uri.slice(prefix.length)}` }
	}

	return message
}

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
		const wsConnection = createWebSocketConnection(socket)
		const serverConnection = createServerProcess('luzzle-lsp', 'luzzle-lsp', ['--stdio'], {
			env: { ...process.env, LUZZLE_LSP_ROOT: LSP_ROOT },
		})

		if (serverConnection) {
			wsConnection.forward(serverConnection, rewriteToServer)
			serverConnection.forward(wsConnection, rewriteToClient)
			wsConnection.onClose(() => serverConnection.dispose())
			serverConnection.onClose(() => wsConnection.dispose())
		} else {
			console.error(`[${new Date().toISOString()}] Failed to start luzzle-lsp`)
			ws.close()
		}

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

export { server, createServer, rewriteToServer, rewriteToClient }
