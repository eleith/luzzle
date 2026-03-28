import { createServer as httpServer } from 'http'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import { toSocket } from 'vscode-ws-jsonrpc'
import { createWebSocketConnection, createServerProcess } from 'vscode-ws-jsonrpc/server'
import { route as frontmatterRoute } from './luzzle-lsp.js'
import { route as markdownRoute } from './markdownlint-lsp.js'

const PORT = 9001
const ROUTES = [frontmatterRoute, markdownRoute]

/**
 * Create a multiplexed connection that broadcasts client messages to all LSP
 * servers and merges their diagnostics back to the client.
 *
 * - Notifications (no id): broadcast to all servers, forwarded from all servers
 * - Requests (id + method): broadcast to all servers, only primary (first) response forwarded
 * - Diagnostics: merged across all servers before forwarding
 */
function createMultiplex(wsConn, routes) {
	const servers = []

	for (const route of routes) {
		const proc = createServerProcess(route.name, route.command, route.args, route.spawnOptions)
		if (proc) {
			servers.push({ route, proc })
		} else {
			console.error(`Failed to start ${route.name}`)
		}
	}

	if (servers.length === 0) return null

	// Per-server diagnostic store for merging
	const diagnosticStore = new Map() // "index:uri" → diagnostics[]

	function getMergedDiagnostics(uri) {
		const merged = []
		for (let i = 0; i < servers.length; i++) {
			const stored = diagnosticStore.get(`${i}:${uri}`)
			if (stored) merged.push(...stored)
		}
		return merged
	}

	// Client → all servers (with per-route transform)
	wsConn.reader.listen((message) => {
		for (const { route, proc } of servers) {
			const copy = JSON.parse(JSON.stringify(message))
			const transformed = route.transform ? route.transform(copy) : copy
			proc.writer.write(transformed)
		}
	})

	// Each server → client
	servers.forEach(({ proc }, index) => {
		proc.reader.listen((message) => {
			// Diagnostics → merge from all servers
			if (message.method === 'textDocument/publishDiagnostics') {
				const { uri, version } = message.params
				diagnosticStore.set(`${index}:${uri}`, message.params.diagnostics || [])
				wsConn.writer.write({
					jsonrpc: '2.0',
					method: 'textDocument/publishDiagnostics',
					params: { uri, diagnostics: getMergedDiagnostics(uri), version },
				})
				return
			}

			// Other notifications → forward from all
			if (message.method !== undefined && message.id === undefined) {
				wsConn.writer.write(message)
				return
			}

			// Responses → primary only
			if (index === 0) {
				wsConn.writer.write(message)
			}
		})
	})

	// Cleanup: client disconnect disposes all servers
	wsConn.onClose(() => {
		for (const { proc } of servers) proc.dispose()
	})
	// Primary server close disposes client
	servers[0].proc.onClose(() => wsConn.dispose())

	return { servers, diagnosticStore }
}

function createServer(routes = ROUTES) {
	const wss = new WebSocketServer({ noServer: true })

	const server = httpServer((req, res) => {
		res.writeHead(404, { 'Content-Type': 'text/plain' })
		res.end('Not Found')
	})

	server.on('upgrade', (req, socket, head) => {
		const url = new URL(req.url || '', 'http://localhost')

		if (url.pathname !== '/editor/lsp') {
			socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
			socket.destroy()
			return
		}

		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit('connection', ws)
		})
	})

	wss.on('connection', (ws) => {
		console.log(`[${new Date().toISOString()}] LSP client connected`)

		const socket = toSocket(ws)
		const wsConn = createWebSocketConnection(socket)
		const multiplex = createMultiplex(wsConn, routes)

		if (!multiplex) {
			console.error(`[${new Date().toISOString()}] Failed to start any LSP process`)
			ws.close()
			return
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
	})
}
/* c8 ignore stop */

export { server, createServer, createMultiplex, ROUTES }
