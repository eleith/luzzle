import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import WebSocket from 'ws'

let mockServerReaderCallbacks
let mockWsConnDispose
let mockServerDisposes

function setupMocks({ failedProcesses = [] } = {}) {
	mockServerReaderCallbacks = []
	mockWsConnDispose = vi.fn()
	mockServerDisposes = []

	let serverIndex = 0

	vi.doMock('vscode-ws-jsonrpc', () => ({
		toSocket: vi.fn((ws) => ws),
	}))

	vi.doMock('vscode-ws-jsonrpc/server', () => ({
		createWebSocketConnection: vi.fn(() => ({
			reader: {
				listen: vi.fn(),
			},
			writer: { write: vi.fn() },
			onClose: vi.fn(),
			dispose: mockWsConnDispose,
		})),
		createServerProcess: vi.fn((name) => {
			if (failedProcesses.includes(name)) return null

			const idx = serverIndex++
			const dispose = vi.fn()
			mockServerDisposes[idx] = dispose
			const readerCallback = { fn: null }
			mockServerReaderCallbacks[idx] = readerCallback

			return {
				reader: {
					listen: vi.fn((cb) => {
						readerCallback.fn = cb
					}),
				},
				writer: { write: vi.fn() },
				onClose: vi.fn(),
				dispose,
			}
		}),
	}))
}

async function startServer(routes) {
	const { createServer } = await import('./server.js')
	const server = routes ? createServer(routes) : createServer()
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
	const address = server.address()
	return {
		server,
		baseUrl: `http://127.0.0.1:${address.port}`,
		wsUrl: `ws://127.0.0.1:${address.port}`,
	}
}

describe('LSP WebSocket Server', () => {
	let server
	let baseUrl
	let wsUrl

	beforeEach(async () => {
		vi.resetModules()
		setupMocks()
		;({ server, baseUrl, wsUrl } = await startServer())
	})

	afterEach(async () => {
		if (server) {
			await new Promise((resolve) => server.close(resolve))
		}
	})

	it('should return 404 for HTTP requests', async () => {
		const res = await fetch(`${baseUrl}/editor/lsp`, { method: 'GET' })
		expect(res.status).toBe(404)
	})

	it('should reject WebSocket upgrade on wrong path', async () => {
		const ws = new WebSocket(`${wsUrl}/unknown`)

		const error = await new Promise((resolve) => {
			ws.on('error', resolve)
			ws.on('unexpected-response', (_req, res) => resolve(res))
		})

		expect(error.statusCode).toBe(404)
	})

	it('should handle upgrade with no url', async () => {
		const net = await import('net')
		const socket = new net.Socket()
		const destroySpy = vi.spyOn(socket, 'destroy')
		const writeSpy = vi.spyOn(socket, 'write').mockReturnValue(true)

		server.emit('upgrade', { url: undefined, headers: {} }, socket, Buffer.alloc(0))

		expect(writeSpy).toHaveBeenCalledWith('HTTP/1.1 404 Not Found\r\n\r\n')
		expect(destroySpy).toHaveBeenCalled()
	})

	it('should reject old sub-routes', async () => {
		const ws = new WebSocket(`${wsUrl}/editor/lsp/frontmatter`)

		const error = await new Promise((resolve) => {
			ws.on('error', resolve)
			ws.on('unexpected-response', (_req, res) => resolve(res))
		})

		expect(error.statusCode).toBe(404)
	})

	it('should accept WebSocket on /editor/lsp and spawn both processes', async () => {
		const { createServerProcess } = await import('vscode-ws-jsonrpc/server')

		const ws = new WebSocket(`${wsUrl}/editor/lsp`)
		await new Promise((resolve) => ws.on('open', resolve))

		expect(ws.readyState).toBe(WebSocket.OPEN)
		expect(createServerProcess).toHaveBeenCalledTimes(2)
		expect(createServerProcess).toHaveBeenCalledWith(
			'luzzle-lsp',
			'luzzle-lsp',
			['--stdio'],
			undefined
		)
		expect(createServerProcess).toHaveBeenCalledWith(
			'markdownlint-lsp',
			'node',
			expect.arrayContaining([expect.stringContaining('markdownlint-lsp.js')]),
			undefined
		)

		ws.close()
		await new Promise((resolve) => ws.on('close', resolve))
	})

	it('should handle client disconnect', async () => {
		const ws = new WebSocket(`${wsUrl}/editor/lsp`)
		await new Promise((resolve) => ws.on('open', resolve))

		ws.close()
		await new Promise((resolve) => ws.on('close', resolve))
	})

	it('should close WebSocket when all processes fail', async () => {
		await new Promise((resolve) => server.close(resolve))

		vi.resetModules()
		setupMocks({ failedProcesses: ['luzzle-lsp', 'markdownlint-lsp'] })

		const started = await startServer()
		server = started.server

		const ws = new WebSocket(`${started.wsUrl}/editor/lsp`)
		await new Promise((resolve) => ws.on('open', resolve))
		await new Promise((resolve) => ws.on('close', resolve))

		expect(ws.readyState).toBe(WebSocket.CLOSED)
	})

	it('should work with custom routes', async () => {
		await new Promise((resolve) => server.close(resolve))

		vi.resetModules()
		setupMocks()

		const customRoutes = [
			{
				name: 'test-lsp',
				command: 'echo',
				args: ['hello'],
				spawnOptions: {},
			},
		]

		const started = await startServer(customRoutes)
		server = started.server

		const ws = new WebSocket(`${started.wsUrl}/editor/lsp`)
		await new Promise((resolve) => ws.on('open', resolve))

		const { createServerProcess } = await import('vscode-ws-jsonrpc/server')
		expect(createServerProcess).toHaveBeenCalledWith('test-lsp', 'echo', ['hello'], {})

		ws.close()
		await new Promise((resolve) => ws.on('close', resolve))
	})
})

describe('createMultiplex', () => {
	let createMultiplex
	let mockWsConn
	let mockCreateServerProcess
	let readerCallbacks
	let writerMocks

	beforeEach(async () => {
		vi.resetModules()
		readerCallbacks = {}
		writerMocks = {}

		const serverIdx = { value: 0 }

		vi.doMock('vscode-ws-jsonrpc', () => ({
			toSocket: vi.fn(),
		}))

		vi.doMock('vscode-ws-jsonrpc/server', () => ({
			createWebSocketConnection: vi.fn(),
			createServerProcess: vi.fn((_name) => {
				const idx = serverIdx.value++
				const writerWrite = vi.fn()
				writerMocks[idx] = writerWrite
				const readerCb = { fn: null }
				readerCallbacks[idx] = readerCb
				return {
					reader: { listen: vi.fn((cb) => (readerCb.fn = cb)) },
					writer: { write: writerWrite },
					onClose: vi.fn(),
					dispose: vi.fn(),
				}
			}),
		}))

		const mod = await import('./server.js')
		createMultiplex = mod.createMultiplex
		mockCreateServerProcess = (await import('vscode-ws-jsonrpc/server')).createServerProcess

		const wsReaderCb = { fn: null }
		readerCallbacks.ws = wsReaderCb
		const wsWriterWrite = vi.fn()
		writerMocks.ws = wsWriterWrite
		mockWsConn = {
			reader: { listen: vi.fn((cb) => (wsReaderCb.fn = cb)) },
			writer: { write: wsWriterWrite },
			onClose: vi.fn(),
			dispose: vi.fn(),
		}
	})

	it('should return null when all processes fail', () => {
		mockCreateServerProcess.mockReturnValue(null)
		const result = createMultiplex(mockWsConn, [
			{ name: 'a', command: 'a', args: [], spawnOptions: {} },
		])
		expect(result).toBeNull()
	})

	it('should broadcast client notifications to all servers', () => {
		const routes = [
			{ name: 'a', command: 'a', args: [], spawnOptions: {} },
			{ name: 'b', command: 'b', args: [], spawnOptions: {} },
		]
		createMultiplex(mockWsConn, routes)

		const notification = { jsonrpc: '2.0', method: 'textDocument/didOpen', params: {} }
		readerCallbacks.ws.fn(notification)

		expect(writerMocks[0]).toHaveBeenCalledWith(notification)
		expect(writerMocks[1]).toHaveBeenCalledWith(notification)
	})

	it('should forward all messages from primary server to client', () => {
		const routes = [
			{ name: 'primary', command: 'a', args: [], spawnOptions: {} },
			{ name: 'secondary', command: 'b', args: [], spawnOptions: {} },
		]
		createMultiplex(mockWsConn, routes)

		const response = { jsonrpc: '2.0', id: 1, result: { capabilities: {} } }
		readerCallbacks[0].fn(response)

		expect(writerMocks.ws).toHaveBeenCalledWith(response)
	})

	it('should drop responses from secondary servers', () => {
		const routes = [
			{ name: 'primary', command: 'a', args: [], spawnOptions: {} },
			{ name: 'secondary', command: 'b', args: [], spawnOptions: {} },
		]
		createMultiplex(mockWsConn, routes)

		const response = { jsonrpc: '2.0', id: 1, result: { capabilities: {} } }
		readerCallbacks[1].fn(response)

		expect(writerMocks.ws).not.toHaveBeenCalled()
	})

	it('should forward non-diagnostic notifications from all servers', () => {
		const routes = [
			{ name: 'primary', command: 'a', args: [], spawnOptions: {} },
			{ name: 'secondary', command: 'b', args: [], spawnOptions: {} },
		]
		createMultiplex(mockWsConn, routes)

		const notification = { jsonrpc: '2.0', method: 'window/logMessage', params: { message: 'hi' } }
		readerCallbacks[1].fn(notification)

		expect(writerMocks.ws).toHaveBeenCalledWith(notification)
	})

	it('should merge diagnostics from all servers', () => {
		const routes = [
			{ name: 'primary', command: 'a', args: [], spawnOptions: {} },
			{ name: 'secondary', command: 'b', args: [], spawnOptions: {} },
		]
		createMultiplex(mockWsConn, routes)

		const uri = 'file:///test.md'
		const primaryDiag = { range: {}, message: 'frontmatter error', source: 'yaml' }
		const secondaryDiag = { range: {}, message: 'markdown error', source: 'markdownlint' }

		// Primary publishes diagnostics
		readerCallbacks[0].fn({
			jsonrpc: '2.0',
			method: 'textDocument/publishDiagnostics',
			params: { uri, diagnostics: [primaryDiag], version: 1 },
		})

		expect(writerMocks.ws).toHaveBeenCalledWith({
			jsonrpc: '2.0',
			method: 'textDocument/publishDiagnostics',
			params: { uri, diagnostics: [primaryDiag], version: 1 },
		})

		writerMocks.ws.mockClear()

		// Secondary publishes diagnostics → merged with primary
		readerCallbacks[1].fn({
			jsonrpc: '2.0',
			method: 'textDocument/publishDiagnostics',
			params: { uri, diagnostics: [secondaryDiag], version: 1 },
		})

		expect(writerMocks.ws).toHaveBeenCalledWith({
			jsonrpc: '2.0',
			method: 'textDocument/publishDiagnostics',
			params: { uri, diagnostics: [primaryDiag, secondaryDiag], version: 1 },
		})
	})

	it('should handle empty diagnostics in merge', () => {
		const routes = [
			{ name: 'primary', command: 'a', args: [], spawnOptions: {} },
			{ name: 'secondary', command: 'b', args: [], spawnOptions: {} },
		]
		createMultiplex(mockWsConn, routes)

		const uri = 'file:///test.md'

		readerCallbacks[0].fn({
			jsonrpc: '2.0',
			method: 'textDocument/publishDiagnostics',
			params: { uri, version: 1 },
		})

		expect(writerMocks.ws).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({ diagnostics: [] }),
			})
		)
	})

	it('should update diagnostics when a server republishes', () => {
		const routes = [
			{ name: 'primary', command: 'a', args: [], spawnOptions: {} },
			{ name: 'secondary', command: 'b', args: [], spawnOptions: {} },
		]
		createMultiplex(mockWsConn, routes)

		const uri = 'file:///test.md'
		const diag1 = { range: {}, message: 'error1' }
		const diag2 = { range: {}, message: 'error2' }

		// Primary sends diag1
		readerCallbacks[0].fn({
			jsonrpc: '2.0',
			method: 'textDocument/publishDiagnostics',
			params: { uri, diagnostics: [diag1], version: 1 },
		})

		// Secondary sends diag2
		readerCallbacks[1].fn({
			jsonrpc: '2.0',
			method: 'textDocument/publishDiagnostics',
			params: { uri, diagnostics: [diag2], version: 1 },
		})

		writerMocks.ws.mockClear()

		// Primary clears its diagnostics
		readerCallbacks[0].fn({
			jsonrpc: '2.0',
			method: 'textDocument/publishDiagnostics',
			params: { uri, diagnostics: [], version: 2 },
		})

		// Should only have secondary's diagnostics now
		expect(writerMocks.ws).toHaveBeenCalledWith({
			jsonrpc: '2.0',
			method: 'textDocument/publishDiagnostics',
			params: { uri, diagnostics: [diag2], version: 2 },
		})
	})

	it('should dispose all servers on client close', () => {
		const routes = [
			{ name: 'a', command: 'a', args: [], spawnOptions: {} },
			{ name: 'b', command: 'b', args: [], spawnOptions: {} },
		]
		const result = createMultiplex(mockWsConn, routes)

		// Trigger the onClose callback
		const onCloseCallback = mockWsConn.onClose.mock.calls[0][0]
		onCloseCallback()

		for (const { proc } of result.servers) {
			expect(proc.dispose).toHaveBeenCalled()
		}
	})

	it('should dispose client when primary server closes', () => {
		const routes = [
			{ name: 'primary', command: 'a', args: [], spawnOptions: {} },
			{ name: 'secondary', command: 'b', args: [], spawnOptions: {} },
		]
		const result = createMultiplex(mockWsConn, routes)

		// Trigger primary's onClose callback
		const primaryOnClose = result.servers[0].proc.onClose.mock.calls[0][0]
		primaryOnClose()

		expect(mockWsConn.dispose).toHaveBeenCalled()
	})

	it('should work when some processes fail', () => {
		let callCount = 0
		mockCreateServerProcess.mockImplementation(() => {
			callCount++
			if (callCount === 1) return null // first fails
			return {
				reader: { listen: vi.fn() },
				writer: { write: vi.fn() },
				onClose: vi.fn(),
				dispose: vi.fn(),
			}
		})

		const routes = [
			{ name: 'failing', command: 'a', args: [], spawnOptions: {} },
			{ name: 'working', command: 'b', args: [], spawnOptions: {} },
		]
		const result = createMultiplex(mockWsConn, routes)

		expect(result).not.toBeNull()
		expect(result.servers).toHaveLength(1)
		expect(result.servers[0].route.name).toBe('working')
	})
})
